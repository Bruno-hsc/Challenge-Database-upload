// vamos usar o metado In para ver se existe as categorias no banco de dados
import { getCustomRepository, getRepository, In } from 'typeorm';

// csv-parse: lib que usaremos para manipular os arqvs csv.
import csvParse from 'csv-parse';
// para abrir arqvs, ler arqvs etc
import fs from 'fs';

import Transaction from '../models/Transaction';
import Category from '../models/Category';

import TransactionsRepository from '../repositories/TransactionsRepository';

interface CSVTransactions {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute(filePath: string): Promise<Transaction[]> {
    // a stream que vai ler os arqvs. Aqui damos um createReadStream no arqv
    // gerado na pasta tmp
    const contactsReadStream = fs.createReadStream(filePath);

    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    // instanciando o csvPar
    const parsers = csvParse({
      // para iniciar da linha 2 no arq import_template.csv
      from_line: 2,
    });

    // o pipe vai fazer ler as linhas conforme elas estiverem disponiveis
    const parseCSV = contactsReadStream.pipe(parsers);

    const transactions: CSVTransactions[] = [];
    const categories: string[] = [];

    // cado dado que passar vamos fazer um async em cada linha vamos desestru
    // turar o title..., cada celula(cell) será uma string
    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      // se um deles n existir da um return
      if (!title || !type || !value) return;

      categories.push(category);
      transactions.push({ title, type, value, category });
    });

    // com o evento end, vai dar o await quando terminar
    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitles = existentCategories.map(
      (category: Category) => category.title,
    );

    // se ela nao existir vamos dar um include, 2 filter é para trar os
    // duplicados. O self é o array de categorias
    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitles.includes(category))
      .filter((value, index, self) => self.indexOf(value) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    // todas as categorias, soma das novas com a existentes
    const finalCategories = [...newCategories, ...existentCategories];

    // para cada transaction .map e retornar um obj com as infs
    const createdTransactions = transactionsRepository.create(
      transactions.map(transaction => ({
        title: transaction.title,
        type: transaction.type,
        value: transaction.value,
        category: finalCategories.find(
          category => category.title === transaction.category,
        ),
      })),
    );

    await transactionsRepository.save(createdTransactions);

    // para excluir o arq depois de rodar
    await fs.promises.unlink(filePath);

    return createdTransactions;

    /*  console.log(addCategoryTitles);
    console.log(existentCategoriesTitles);
    console.log(transactions); */
  }
}

export default ImportTransactionsService;
