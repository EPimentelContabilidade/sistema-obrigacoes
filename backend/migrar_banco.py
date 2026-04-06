"""
Script de migração — adiciona novos campos à tabela clientes
Execute: python migrar_banco.py
"""
import sqlite3
import os

DB_PATH = "obrigacoes.db"

NOVAS_COLUNAS = [
    ("nome_fantasia",      "TEXT"),
    ("email2",             "TEXT"),
    ("email_contador",     "TEXT"),
    ("whatsapp2",          "TEXT"),
    ("telefone",           "TEXT"),
    ("obs_comunicacao",    "TEXT"),
    ("cep",                "TEXT"),
    ("logradouro",         "TEXT"),
    ("numero",             "TEXT"),
    ("complemento",        "TEXT"),
    ("bairro",             "TEXT"),
    ("municipio",          "TEXT"),
    ("uf",                 "TEXT"),
    ("responsavel_nome",   "TEXT"),
    ("responsavel_cpf",    "TEXT"),
    ("responsavel_tel",    "TEXT"),
    ("responsavel_email",  "TEXT"),
    ("inscricao_estadual", "TEXT"),
    ("inscricao_municipal","TEXT"),
    ("cnae",               "TEXT"),
    ("cnaes_secundarios",  "TEXT"),
    ("porte",              "TEXT"),
    ("natureza_juridica",  "TEXT"),
    ("capital_social",     "TEXT"),
    ("situacao_receita",   "TEXT"),
    ("data_inicio",        "TEXT"),
]

if not os.path.exists(DB_PATH):
    print(f"❌ Banco '{DB_PATH}' não encontrado.")
    exit(1)

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Verificar colunas existentes
cursor.execute("PRAGMA table_info(clientes)")
colunas_existentes = {row[1] for row in cursor.fetchall()}

adicionadas = 0
for nome, tipo in NOVAS_COLUNAS:
    if nome not in colunas_existentes:
        cursor.execute(f"ALTER TABLE clientes ADD COLUMN {nome} {tipo}")
        print(f"  ✅ Coluna adicionada: {nome}")
        adicionadas += 1
    else:
        print(f"  ⏭️  Já existe: {nome}")

conn.commit()
conn.close()

print(f"\n✅ Migração concluída! {adicionadas} coluna(s) adicionada(s).")
