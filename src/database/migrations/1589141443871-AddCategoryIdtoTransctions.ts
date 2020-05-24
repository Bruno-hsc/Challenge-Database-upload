import {
  MigrationInterface,
  QueryRunner,
  TableColumn,
  TableForeignKey,
} from 'typeorm';
// aqui nao criaremos uma nova tabela e sim uma nova coluna

export default class AddCategoryIdtoTransctions1589141443871
  implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'transactions',
      new TableColumn({
        name: 'category_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    // criando a chave estrangeira
    await queryRunner.createForeignKey(
      'transactions',
      new TableForeignKey({
        // nome da coluna na tabela de transactios
        columnNames: ['category_id'],
        // nome da coluna que vai estar referenciada na foreignKey
        referencedColumnNames: ['id'],
        referencedTableName: 'categories',
        // apelido para a chave estrangeira
        name: 'TransactionCategory',
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // nome da tabela que vamos trobar e o nome da foreignKey
    await queryRunner.dropForeignKey('transactions', 'TransactionCategory');

    // aqui droparemos a coluna
    await queryRunner.dropColumn('transactions', 'category_id');
  }
}
