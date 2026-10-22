const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const read=file=>fs.readFileSync(path.join(__dirname,'..',file),'utf8');
function setup(){
 const names=['Mini Kit','Family Kit','Rooftop Kit'];
 const titles=names.map(name=>({textContent:name,link:null,querySelector(){return this.link;},replaceChildren(link){this.link=link;}}));
 let callback,observeOptions;
 const grid={querySelectorAll:()=>titles.map(title=>({querySelector:()=>title}))};
 const context={window:{},document:{querySelector:()=>grid,createElement:()=>({setAttribute(){}})},MutationObserver:function(fn){callback=fn;this.observe=(element,options)=>{assert.equal(element,grid);observeOptions=options;};}};
 vm.createContext(context);vm.runInContext(read('js/articles-data.js'),context);vm.runInContext(read('js/product-article-links.js'),context);
 return {titles,names,context,callback,observeOptions};
}
test('three cards link to the existing articles by related_product',()=>{
 const {titles,names,context}=setup();titles.forEach((title,i)=>{const article=context.window.VUONPHO_ARTICLES.find(a=>a.related_product===names[i]);assert.ok(article);assert.equal(title.link.href,'noi-dung.html?slug='+article.slug);assert.equal(title.link.textContent,names[i]);});
});
test('API replacements are enhanced once without changing consultation handlers',()=>{
 const {titles,callback,observeOptions}=setup();assert.equal(observeOptions.childList,true);const original=titles[0].link;callback();assert.equal(titles[0].link,original);titles[0].link=null;callback();assert.ok(titles[0].link.href.includes('mini-kit-bo-khi-canh-ban-cong'));
 const html=read('products.html');for(const name of ['Mini Kit','Family Kit','Rooftop Kit'])assert.ok(html.includes("chooseProduct('"+name+"')"));assert.ok(html.indexOf('js/articles-data.js')<html.indexOf('js/product-article-links.js'));assert.ok(!html.includes('package.html'));
});
