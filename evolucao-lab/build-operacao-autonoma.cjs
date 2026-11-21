'use strict';
/* Gerador deterministico de HTML autonomo a partir da mesma lista do HTML modular.
 * Nao altera o arquivo original: cria um artefato descartavel no caminho indicado.
 * Permite regenerar pacote conforme os modulos crescem, sem manifesto manual.
 */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=__dirname;
function build({destination=null}={}){
 const original=fs.readFileSync(path.join(root,'operacao-integrada.html'),'utf8');
 const pattern=/<script\s+src="\.\/([^"]+)"\s*><\/script>/g;
 const paths=[...original.matchAll(pattern)].map(m=>m[1]);
 if(paths.length<34||new Set(paths).size!==paths.length)
  throw Error('Lista de scripts ausente, curta ou duplicada no HTML de origem.');
 const resolved=paths.map(src=>{
  const file=path.resolve(root,src);
  if(!file.startsWith(root+path.sep)||!file.endsWith('.js')||!fs.statSync(file).isFile())
   throw Error('Caminho de script invalido: '+src);
  const content=fs.readFileSync(file,'utf8');
  if(!content.trim())throw Error('Arquivo JS vazio: '+src);
  new vm.Script(content,{filename:src});
  return {src,content};
 });
 let index=0;
 const generated=original.replace(pattern,()=>{
  const {src,content}=resolved[index++];
  // Separar os scripts preserva a semantica de escopo e a ordem de carregamento.
  // Proibir terminador HTML dentro do JS evita quebrar o elemento <script>.
  if(/<\/script/i.test(content))throw Error('Terminador HTML dentro do JS: '+src);
  return '<script>\n/* Fonte embutida: '+src+' */\n'+content+'\n</script>';
 });
 if(index!==resolved.length||/<script\s+src=/.test(generated))
  throw Error('Nem todos os scripts foram incorporados.');
 if(destination){
  fs.mkdirSync(path.dirname(destination),{recursive:true});
  fs.writeFileSync(destination,generated);
 }
 return {html:generated,scripts:paths,sizeBytes:Buffer.byteLength(generated,'utf8')};
}
if(require.main===module){
 const dest=process.argv[2]||path.join(root,'operacao-integrada-autonoma-atualizada.html');
 const result=build({destination:path.resolve(dest)});
 console.log('Pacote autônomo montado: '+result.scripts.length+
  ' scripts, '+result.sizeBytes+' bytes; destino '+dest);
}
module.exports={build};
