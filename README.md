# Mãos Solidárias

Landing page para mobilizar ajuda a pessoas em situação de rua: painel **"Avistei alguém"**,
Mural da Esperança com PIX ou ONG, carrossel de doações de itens, ONGs e documentários.

Abra `index.html` direto no navegador; não precisa de servidor nem de instalação.

## Estrutura

```
index.html          Estrutura das seções
css/style.css       Cores (variáveis em :root), layout e componentes
css/animations.css  Animações; desligadas se o sistema pedir "menos movimento"
js/data.js          TODO o conteúdo editável (mural, doações, ONGs, documentários)
js/main.js          Comportamento: painel em passos, mural, carrossel, etc.
```

## Como editar o conteúdo (js/data.js)

- **Adicionar alguém ao mural:** copie um item de `MURAL` e troque os campos.
  - `foto`: caminho como `"assets/img/joao.jpg"` ou URL `https://...` (vazio = avatar colorido).
  - `pix`: chave da própria pessoa. Vazio mostra **Ajudar via ONG** (`ong`).
  - `tipoLocal`: uma chave de `LOCAIS` (`semaforo`, `praca`, `marquise`, `viaduto`, `calcada`, `outro`).
  - `precisa`: chaves de `NECESSIDADES` (`comida`, `cobertor`, `abrigo`...).
  - Remova `exemplo: true` para tirar o selo "Perfil de exemplo".
- **Doações:** edite `ITENS_DOACAO` (ícone, cor, dicas e `meta` em %).
- **ONGs / documentários / galeria:** edite `ONGS`, `DOCUMENTARIOS` e `GALERIA`.
- **Palavras de alerta:** `PALAVRAS_URGENCIA` e `PALAVRAS_MENOR` controlam os avisos automáticos.

Cores disponíveis para `cor`: `magenta`, `laranja`, `roxo`, `turquesa`, `azul`, `amarelo`.

## Recursos do painel "Avistei alguém"

- Formulário em 4 passos com barra de progresso e validação por passo.
- Foto com arrastar e soltar, compressão automática e **desfoque** (obrigatório para menores).
- GPS com **endereço automático** (OpenStreetMap/Nominatim) e mini-mapa.
- Atalhos de horário ("Agora", "Há 1 h", "Há 3 h").
- Detecção de emergência no texto ("ferido", "desmaiado"...), que marca urgência alta e mostra o SAMU 192.
- Aviso de Conselho Tutelar / 190 / Disque 100 quando o texto ou a faixa etária indicam um menor.
- Chave PIX com detecção do tipo (CPF, CNPJ, e-mail, telefone, aleatória) e validação dos dígitos.
- Rascunho salvo automaticamente; protocolo `MS-AAAA-XXXX` ao enviar.

## Importante

- É um **protótipo**: os envios ficam no `localStorage` do navegador. Para publicar de verdade
  é preciso um back-end (ex.: Supabase) com moderação.
- Só publique fotos, histórias e chaves PIX com **autorização da pessoa retratada** (LGPD).
- O vídeo do hero e as fotos vêm de Pexels e Unsplash. Para trocar o vídeo, edite o `<source>` em `index.html`.
