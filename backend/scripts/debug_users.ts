
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                email: true,
                nome: true,
                tenants: {
                    select: {
                        role: true,
                        tenant: {
                            select: {
                                id: true,
                                nome_restaurante: true
                            }
                        }
                    }
                }
            }
        });

        console.log('--- USERS IN DB ---');
        if (users.length === 0) {
            console.log('No users found. Database is empty.');
        } else {
            users.forEach(u => {
                console.log(`ID: ${u.id} | Email: ${u.email} | Name: ${u.nome}`);
                if (u.tenants.length > 0) {
                    u.tenants.forEach(t => {
                        console.log(`   - Tenant: ${t.tenant.nome_restaurante} (ID: ${t.tenant.id}) | Role: ${t.role}`);
                    });
                } else {
                    console.log('   - No tenants assigned');
                }
                console.log('---');
            });
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
