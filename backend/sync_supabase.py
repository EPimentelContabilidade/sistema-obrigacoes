import asyncio
from datetime import datetime, date, timedelta
from supabase import create_client, Client
from services.goiania_scraper import executar_robot_goiania

URL_SUPABASE = "SUA_URL_AQUI"
KEY_SUPABASE = "SUA_KEY_AQUI"

supabase: Client = create_client(URL_SUPABASE, KEY_SUPABASE)

def buscar_datas_mes_passado():
    hoje = date.today()
    primeiro_dia_mes_atual = hoje.replace(day=1)
    ultimo_dia_mes_passado = primeiro_dia_mes_atual - timedelta(days=1)
    primeiro_dia_mes_passado = ultimo_dia_mes_passado.replace(day=1)
    
    return primeiro_dia_mes_passado.strftime("%d/%m/%Y"), ultimo_dia_mes_passado.strftime("%d/%m/%Y")

async def rodar_sincronizacao():
    # Calcula as datas automaticamente
    data_ini, data_fim = buscar_datas_mes_passado()
    print(f"📅 Período identificado: {data_ini} até {data_fim}")
    
    try:
        query = supabase.table("cliente").select("*").eq("ativo", True).execute()
        lista_clientes = query.data
        
        if not lista_clientes:
            print("Nenhum cliente ativo.")
            return

        for cli in lista_clientes:
            nome = cli.get('nome_empresa', 'Sem_Nome')
            print(f"\n[EPimentel] 🤖 Iniciando: {nome}")
            
            # Passamos o nome da empresa para o robô criar a pasta
            resultado = await executar_robot_goiania(
                login=cli.get('login'),
                senha=cli.get('senha'),
                id_cliente_prefeitura=cli.get('id_prefeitura'),
                data_inicio=data_ini,
                data_fim=data_fim,
                nome_pasta=nome  # Novo parâmetro!
            )
            print(f"✅ {resultado}")

    except Exception as e:
        print(f"Erro: {e}")

if __name__ == "__main__":
    asyncio.run(rodar_sincronizacao())