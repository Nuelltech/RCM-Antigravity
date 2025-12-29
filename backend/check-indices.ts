import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function checkIndices() {
  const result = await prisma.$queryRaw<any[]>`
    SELECT 
      TABLE_NAME, 
      INDEX_NAME, 
      GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) as COLUMNS
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = 'rcm_db'
      AND TABLE_NAME IN ('produtos', 'receitas', 'vendas')
    GROUP BY TABLE_NAME, INDEX_NAME
    ORDER BY TABLE_NAME, INDEX_NAME
  `;
  
  console.table(result);
  console.log(`\nTotal indices: ${result.length}`);
}
checkIndices()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
