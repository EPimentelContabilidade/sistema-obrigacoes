import sqlite3, os

db = 'obrigacoes.db'
conn = sqlite3.connect(db)
c = conn.cursor()

c.execute('PRAGMA table_info(clientes)')
exist = {r[1] for r in c.fetchall()}

if 'grupo' not in exist:
    conn.execute('ALTER TABLE clientes ADD COLUMN grupo TEXT')
    print('✅ Coluna grupo adicionada!')
else:
    print('⏭️  Coluna grupo já existe.')

c.execute('SELECT COUNT(*) FROM clientes')
print(f'✅ Clientes no banco: {c.fetchone()[0]}')

conn.commit()
conn.close()
print('Pronto!')
