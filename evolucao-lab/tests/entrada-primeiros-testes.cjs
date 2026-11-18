'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),page=fs.readFileSync(path.join(root,'entrada.html'),'utf8');
test('prévia tem roteiro inicial e links que existem na branch isolada',()=>{
 assert.match(page,/<section class="quick-start" aria-labelledby="quick-title">/);
 for(const label of ['1. Pedidos e Corte','2. Facções, Acertos e Hub','3. Registre o que melhorar',
 'Não está liberado para testar com dados reais','Baixar relatório JSON'])assert.ok(page.includes(label),label);
 const links=Array.from(page.matchAll(/<a\b[^>]*href="([^"]+)"/g),m=>m[1]);
 assert.equal(links.length,23,'A página mantém 20 links originais e acrescenta 3 pontos de entrada');
 for(const link of links){
  assert.ok(link.startsWith('./'),'Somente arquivos do laboratório: '+link);
  assert.ok(!link.includes('..'),'Sem travessia entre pastas');
  assert.ok(fs.existsSync(path.resolve(root,link.split('#')[0])),'Arquivo linkado deve existir: '+link);
 }
 assert.equal(links.filter(x=>x==='./homologacao-modulos.html').length,2);
});
test('orientação de testes é honesta sobre persistência local e não acesso à empresa',()=>{
 for(const phrase of ['dados inventados','neste navegador','não comprovam a migração',
 'login de funcionários','sincronização entre computadores','Supabase','dados reais']){
  assert.ok(page.includes(phrase),'Aviso obrigatório: '+phrase);
 }
 for(const forbidden of ['fetch(','XMLHttpRequest','https://supabase','/api/pay','/api/upload']){
  assert.equal(page.includes(forbidden),false,'A página inicial não executa API de produção');
 }
});
