# Publicando o alternafit na internet

Este guia coloca o backend (Django + MySQL) no **PythonAnywhere** e o app React na **Vercel**, as duas opções gratuitas que escolhemos. A ideia é seguir os passos na ordem, com calma.

> Os planos gratuitos e as telas desses serviços mudam de vez em quando. Se algum botão estiver com outro nome, procure algo parecido. O objetivo de cada passo está explicado.

Ao longo do guia, troque `seuusuario` pelo seu nome de usuário no PythonAnywhere.

## Parte 0: preparação

### Checklist

- [ ] Os testes passam no seu computador: `venv\Scripts\python.exe manage.py test`
- [ ] Conta no PythonAnywhere criada
- [ ] Conta na Vercel criada
- [ ] Organização do GitHub criada e repositório transferido para ela
- [ ] Formulário de feedback criado (Google Forms)

### Conta no PythonAnywhere (backend e banco)

1. Acesse https://www.pythonanywhere.com → **Pricing & signup** → **Create a Beginner account** (gratuito, sem cartão).
2. **Escolha bem o nome de usuário**: ele vira o endereço do backend (`alternafit` vira `alternafit.pythonanywhere.com`). Se estiver ocupado, tente algo como `alternafitapp`.
3. Confirme o e-mail.

### Conta na Vercel (o app que as pessoas abrem)

1. Acesse https://vercel.com/signup e escolha **Hobby** (gratuito, para projetos não comerciais, como um projeto de extensão).
2. Entre com **Continue with GitHub**.

Se a Vercel pedir plano pago para importar um repositório de organização, dá para publicar pelo terminal com a ferramenta da Vercel (`npx vercel`), sem ligar ao GitHub.

### Organização no GitHub ✅

O repositório oficial agora é **https://github.com/Alternafit/alternafit**, na organização Alternafit. Ele foi criado com todo o histórico do repositório antigo (`Vlad-lll/-alternafit`), mantendo a autoria de cada commit.

Quem já tinha o projeto baixado deve apontar a pasta para o endereço novo:

```
git remote set-url origin https://github.com/Alternafit/alternafit.git
git pull
```

O repositório antigo deve ser arquivado (Settings → Archive this repository), para ninguém continuar mexendo nele por engano.

### Formulário de feedback (Google Forms)

1. Acesse https://forms.google.com → **Em branco**. Título: *alternafit: feedback da versão de testes*.
2. Perguntas sugeridas:

| Pergunta | Tipo |
|---|---|
| Onde você usou o app? | Múltipla escolha: Academia / Casa / Outro |
| Encontrou o exercício que procurava? | Múltipla escolha: Sim / Não / Mais ou menos |
| Se não encontrou, qual exercício você buscou? | Resposta curta (opcional) |
| As alternativas sugeridas fizeram sentido? | Escala de 1 a 5 |
| Você chegou a fazer alguma alternativa no treino? | Sim / Não |
| Algo não funcionou ou ficou confuso? | Parágrafo (opcional) |
| Qual aparelho você usou? | Android / iPhone / Computador |
| De 0 a 10, quanto você recomendaria o app a um amigo? | Escala de 0 a 10 |
| Sugestões | Parágrafo (opcional) |

3. Em **Configurações**, deixe **desligado** "Coletar endereços de e-mail" e "Limitar a uma resposta" (essa exige login no Google e afasta testadores). Formulário anônimo = sem dados pessoais para cuidar (LGPD).
4. **Enviar** → ícone de link → **Encurtar URL** → copie. Esse link vai na variável `VITE_FEEDBACK_URL` da Vercel (Parte 2).
5. Na aba **Respostas**, clique em **Vincular ao Planilhas** para as respostas caírem numa planilha.

## Parte 1: o backend no PythonAnywhere

### 1. Crie o banco de dados

1. No painel do PythonAnywhere, abra a aba **Databases**.
2. Em "MySQL password", crie uma senha para o banco (guarde-a; é diferente da senha da conta).
3. Em "Create a database", crie um banco chamado `alternafit`. O nome completo dele será `seuusuario$alternafit`.
4. Anote o endereço que aparece em "Database host address" (algo como `seuusuario.mysql.pythonanywhere-services.com`).
5. Clique no nome do banco para abrir um console MySQL e rode:

```sql
ALTER DATABASE `seuusuario$alternafit` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Isso garante que acentos e emojis sejam salvos corretamente (é o mesmo `utf8mb4` que usamos no computador).

### 2. Baixe o código

Abra a aba **Consoles** e inicie um console **Bash**. Nele:

```bash
git clone https://github.com/Alternafit/alternafit.git alternafit
cd alternafit/backend
python3.11 -m venv venv
venv/bin/python -m pip install -r requirements.txt
```

Se `python3.11` não existir, use outra versão a partir da 3.10 (por exemplo `python3.12`).

### 3. Crie o `.env` do servidor

Ainda no console, gere uma chave secreta **nova** (nunca reaproveite a do seu computador):

```bash
venv/bin/python -c "from django.core.management.utils import get_random_secret_key as g; print(g())"
```

Depois crie o arquivo com `nano .env` e cole o conteúdo abaixo, trocando os valores:

```
DB_NAME='seuusuario$alternafit'
DB_USER=seuusuario
DB_PASSWORD=a_senha_do_mysql_do_passo_1
DB_HOST=seuusuario.mysql.pythonanywhere-services.com
DB_PORT=3306

DJANGO_SECRET_KEY='cole_a_chave_gerada_aqui'
DJANGO_DEBUG=False
DJANGO_ALLOWED_HOSTS=seuusuario.pythonanywhere.com
DJANGO_CSRF_TRUSTED_ORIGINS=https://seuusuario.pythonanywhere.com
DJANGO_CORS_ALLOWED_ORIGINS=https://endereco-do-app.vercel.app
DJANGO_API_THROTTLE_RATE=120/minute
```

- O `DB_NAME` vai **entre aspas simples** por causa do `$`.
- O `DJANGO_CORS_ALLOWED_ORIGINS` você só vai saber na Parte 2. Por enquanto, deixe como está e volte aqui depois.
- Para salvar no `nano`: `Ctrl+O`, `Enter`, `Ctrl+X`.

### 4. Prepare o banco e os dados

```bash
venv/bin/python manage.py migrate
venv/bin/python manage.py createsuperuser
venv/bin/python manage.py importar_planilha ../data/alternafit_banco_exercicios_v2.3.xlsx --dry-run
venv/bin/python manage.py importar_planilha ../data/alternafit_banco_exercicios_v2.3.xlsx
venv/bin/python manage.py collectstatic --noinput
```

O último comando junta os arquivos visuais do Admin (cores, fontes) na pasta `staticfiles/`, de onde o servidor vai entregá-los.

### 5. Configure o site

1. Abra a aba **Web** e clique em **Add a new web app**.
2. Escolha **Manual configuration** (não escolha a opção "Django" pronta) e a mesma versão de Python do passo 2.
3. Na seção **Virtualenv**, informe: `/home/seuusuario/alternafit/backend/venv`
4. Na seção **Code**, clique no link do **WSGI configuration file**, apague tudo e cole:

```python
import os
import sys

path = '/home/seuusuario/alternafit/backend'
if path not in sys.path:
    sys.path.append(path)

os.environ['DJANGO_SETTINGS_MODULE'] = 'alternafit_backend.settings'

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

5. Na seção **Static files**, adicione: URL `/static/` e diretório `/home/seuusuario/alternafit/backend/staticfiles`
6. Na seção **Security**, ligue **Force HTTPS**.
7. Clique no botão verde **Reload**.

### 6. Confira

- https://seuusuario.pythonanywhere.com/api/exercicios/ mostra os exercícios?
- https://seuusuario.pythonanywhere.com/admin/ abre com o visual normal e aceita o seu login?

Se aparecer "Something went wrong", veja o **Error log** na aba Web: o erro de verdade está lá.

## Parte 2: o app na Vercel

1. Na Vercel, clique em **Add New → Project** e importe o repositório do GitHub.
2. A Vercel reconhece o Vite sozinha. Confira: build command `npm run build`, output `dist`, pasta raiz do repositório.
3. Em **Environment Variables**, crie:
   - `VITE_API_URL` com o valor `https://seuusuario.pythonanywhere.com/api`
   - `VITE_FEEDBACK_URL` com o link do formulário de feedback (ex.: Google Forms). Sem ela, o botão "Dar feedback" não aparece no app.
4. Clique em **Deploy** e anote o endereço que ela der (algo como `https://alternafit.vercel.app`).
5. Volte ao console do PythonAnywhere, abra o `.env` (`nano .env`), coloque esse endereço em `DJANGO_CORS_ALLOWED_ORIGINS` e clique em **Reload** na aba Web.

Abra o endereço da Vercel no celular e faça uma busca. Se os exercícios aparecerem, está no ar!

A partir daqui, todo `git push` para o `main` publica o app novo sozinho na Vercel.

## Depois de publicar

**Atualizar o backend** (quando houver mudanças no GitHub), no console Bash:

```bash
cd ~/alternafit && git pull
cd backend
venv/bin/python -m pip install -r requirements.txt
venv/bin/python manage.py migrate
venv/bin/python manage.py collectstatic --noinput
```

E clique em **Reload** na aba Web.

**Importar uma planilha nova:** faça antes um backup do banco (abaixo), rode o `importar_planilha` com `--dry-run`, confira e rode de verdade.

**Backup do banco:**

```bash
mysqldump -u seuusuario -h seuusuario.mysql.pythonanywhere-services.com --no-tablespaces 'seuusuario$alternafit' > ~/backup-$(date +%F).sql
```

**Manter o site ligado:** no plano gratuito, o PythonAnywhere desliga o site depois de alguns meses sem renovação. Entre de vez em quando na aba Web e clique em **Run until 3 months from today**.

**HTTPS mais forte (opcional, depois de tudo funcionando):** com o site abrindo bem por HTTPS, dá para acrescentar ao `.env` as linhas `DJANGO_SECURE_SSL_REDIRECT=True` e `DJANGO_SECURE_HSTS_SECONDS=3600`. O HSTS faz o navegador "lembrar" de só usar HTTPS; comece com um valor pequeno, porque ele é difícil de desfazer.

## Contas no Admin para o time de Educação Física

Para alguém do time revisar e editar exercícios sem poder mexer no resto:

1. No Admin, crie um **Grupo** (por exemplo, "Educação Física") e dê a ele as permissões de exercícios, alternativas, grupos musculares, equipamentos, passos, apelidos e fontes.
2. Crie um **Usuário** para cada pessoa, marque **Membro da equipe** (para poder entrar no Admin) e coloque-o nesse grupo. Não marque "Superusuário".

Lembre que uma nova importação da planilha substitui o catálogo inteiro: combine com o time se a fonte oficial dos dados passa a ser o Admin ou a planilha.
