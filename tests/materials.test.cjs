const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function setup(){
 const nodes={};
 function element(){return {value:'',innerHTML:'',hidden:false,textContent:'',events:{},addEventListener(type,fn){this.events[type]=fn;},querySelectorAll(){return [];},querySelector(){return nodes.close;},add(){},showModal(){this.open=true;},close(){this.open=false;}};}
 for(const id of ['#materials-grid','#material-search','#material-category','#materials-more','#material-detail','#material-detail-content','#materials-count','#materials-empty','close'])nodes[id]=element();
 const context={window:{},document:{querySelector:id=>nodes[id]},Option:function(text,value){this.text=text;this.value=value;},Intl,URLSearchParams};
 vm.createContext(context);
 for(const file of ['js/materials-data.js','js/materials.js'])vm.runInContext(fs.readFileSync(file,'utf8'),context);
 return {nodes,data:context.window.VuonPhoMaterials};
}
test('demo schema, placeholders, pagination and contact links',()=>{
 const {nodes:n,data}=setup();assert.equal(data.categories.length,5);assert.equal(data.items.length,8);
 for(const item of data.items){for(const key of ['id','name','category','price','image','description','specifications','stockStatus'])assert.ok(Object.hasOwn(item,key));assert.equal(item.price,item.id === 'VT001' ? 155000 : item.id === 'VT002' ? 160000 : item.id === 'VT003' ? 300000 : item.id === 'VT004' ? 980000 : null);if(item.isDemo){assert.equal(item.isDemo,true);assert.equal(item.image,null);}}
 assert.equal((n['#materials-grid'].innerHTML.match(/<article/g)||[]).length,4);
 assert.match(n['#materials-grid'].innerHTML,/contact.html\?material=/);
 n['#materials-more'].events.click();assert.equal((n['#materials-grid'].innerHTML.match(/<article/g)||[]).length,8);assert.equal(n['#materials-more'].hidden,true);assert.match(n['#materials-grid'].innerHTML,/Đang cập nhật/);assert.match(n['#materials-grid'].innerHTML,/material-placeholder/);
});
test('search without accents, combined category filter and empty state',()=>{
 const {nodes:n,data}=setup();n['#material-search'].value='may bom';n['#material-search'].events.input();assert.match(n['#materials-count'].textContent,/1 \/ 1/);
 n['#material-category'].value=data.categories[0];n['#material-category'].events.change();assert.equal(n['#materials-empty'].hidden,false);
 n['#material-search'].value='';n['#material-search'].events.input();assert.match(n['#materials-count'].textContent,/3 \/ 3/);
});
test('details open, include missing data fallbacks and close',()=>{
 const {nodes:n}=setup();n['#materials-grid'].events.click({target:{closest:()=>({dataset:{id:'demo-3'}})}});assert.equal(n['#material-detail'].open,true);assert.match(n['#material-detail-content'].innerHTML,/Thông số kỹ thuật/);assert.doesNotMatch(n['#material-detail-content'].innerHTML,/>[^<]*DEMO/i);n.close.events.click();assert.equal(n['#material-detail'].open,false);
});
test('shared navigation, footer and responsive breakpoints',()=>{
 for(const file of ['index','about','services','products','contact','account','login','register','materials']){const html=fs.readFileSync(file+'.html','utf8');assert.equal((html.match(/class="product-menu"/g)||[]).length,2);}
 const html=fs.readFileSync('materials.html','utf8');const products=fs.readFileSync('products.html','utf8');assert.equal(html.match(/<footer[\s\S]*?<\/footer>/)[0],products.match(/<footer[\s\S]*?<\/footer>/)[0]);
 const css=fs.readFileSync('css/materials.css','utf8');assert.match(css,/repeat\(4,minmax/);assert.match(css,/@media\(max-width:1100px\)/);assert.match(css,/@media\(max-width:600px\)/);
});

test('VT001 has verified PNG files, sale price, gallery switching and full details',()=>{
 const {nodes:n,data}=setup();const item=data.items[0];assert.equal(item.id,'VT001');assert.equal(data.items.filter(p=>p.id==='VT001').length,1);assert.equal(item.isDemo,false);assert.equal(item.price,155000);assert.equal(item.referencePrice,undefined);assert.equal(item.images.length,7);
 for(const image of item.images){const bytes=fs.readFileSync(image.src);assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');}
 assert.match(n['#materials-grid'].innerHTML,/<\/h3><p class="material-price">155\.000đ<\/p>/);assert.ok(n['#materials-grid'].innerHTML.includes(item.image));
 n['#material-search'].value='rockwool';n['#material-search'].events.input();assert.match(n['#materials-count'].textContent,/1 \/ 1/);
 n['#material-category'].value=item.category;n['#material-category'].events.change();assert.match(n['#materials-count'].textContent,/1 \/ 1/);
 n['#materials-grid'].events.click({target:{closest:()=>({dataset:{id:'VT001'}})}});
 const detail=n['#material-detail-content'];assert.equal((detail.innerHTML.match(/data-gallery-index=/g)||[]).length,7);assert.match(detail.innerHTML,/<\/h2><p class="material-price">155\.000đ<\/p>/);assert.doesNotMatch(detail.innerHTML,/Liên hệ báo giá|Đang cập nhật|Giá tham khảo/);assert.match(detail.innerHTML,/Bông khoáng Rockwool/);assert.doesNotMatch(detail.innerHTML,/Tình trạng:/);assert.equal(n['#material-detail'].open,true);
 const main={};const buttons=item.images.map((_,i)=>({dataset:{galleryIndex:String(i)},setAttribute(k,v){this[k]=v;}}));detail.querySelector=()=>main;detail.querySelectorAll=()=>buttons;
 buttons.forEach((button,index)=>{detail.events.click({target:{closest:()=>button}});assert.equal(main.src,item.images[index].src);assert.equal(main.alt,item.images[index].alt);assert.equal(button['aria-pressed'],'true');assert.equal(buttons.filter(b=>b['aria-pressed']==='true').length,1);});
 n.close.events.click();assert.equal(n['#material-detail'].open,false);
});

test('VT002 card, category search, full details and four gallery images',()=>{
 const {nodes:n,data}=setup();const item=data.items.find(p=>p.id==='VT002');assert.equal(data.items.filter(p=>p.id==='VT002').length,1);assert.equal(item.price,160000);assert.equal(item.images.length,4);
 for(const image of item.images){const bytes=fs.readFileSync(image.src);assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 n['#material-search'].value='mut xop';n['#material-search'].events.input();n['#material-category'].value=item.category;n['#material-category'].events.change();assert.match(n['#materials-count'].textContent,/1 \/ 1/);
 assert.ok(n['#materials-grid'].innerHTML.includes(item.image));assert.ok(n['#materials-grid'].innerHTML.includes('</h3><p class="material-price">160.000đ</p>'));assert.match(n['#materials-grid'].innerHTML,/Xem chi tiết/);assert.match(n['#materials-grid'].innerHTML,/Liên hệ tư vấn/);
 n['#materials-grid'].events.click({target:{closest:()=>({dataset:{id:item.id}})}});const detail=n['#material-detail-content'];assert.equal(n['#material-detail'].open,true);assert.equal((detail.innerHTML.match(/data-gallery-index=/g)||[]).length,4);assert.ok(detail.innerHTML.includes('</h2><p class="material-price">160.000đ</p>'));assert.ok(detail.innerHTML.includes("<dt>Kích thước</dt><dd>25 × 25 × 25</dd>"));assert.doesNotMatch(detail.innerHTML,/chưa xác nhận|nguồn tham khảo|giá tham khảo|Shopee|DEMO|Tình trạng:/i);
 const main={};const buttons=item.images.map((_,i)=>({dataset:{galleryIndex:String(i)},setAttribute(k,v){this[k]=v;}}));detail.querySelector=()=>main;detail.querySelectorAll=()=>buttons;buttons.forEach((button,i)=>{detail.events.click({target:{closest:()=>button}});assert.equal(main.src,item.images[i].src);assert.equal(button['aria-pressed'],'true');});n.close.events.click();assert.equal(n['#material-detail'].open,false);
});

test('future real products use sale price placement and omit internal source and unverified inventory',()=>{
 const {nodes:n,data}=setup();data.items.push({id:'future-real',name:'Vật tư kiểm thử',isDemo:false,category:data.categories[0],price:170000,specifications:{},referencePrice:180000,stockStatus:'Chưa xác nhận',internalNotes:'DEMO Shopee nguồn tham khảo'});
 n['#material-search'].value='Vật tư kiểm thử';n['#material-search'].events.input();assert.doesNotMatch(n['#materials-grid'].innerHTML,/DEMO|Shopee|nguồn tham khảo/i);
 n['#materials-grid'].events.click({target:{closest:()=>({dataset:{id:'future-real'}})}});const html=n['#material-detail-content'].innerHTML;assert.ok(html.includes('</h2><p class="material-price">170.000đ</p>'));assert.doesNotMatch(html,/chưa xác nhận|nguồn tham khảo|giá tham khảo|Shopee|DEMO|Tình trạng:/i);
});

test('VT003 replaces demo tower with complete specs, price, gallery and contact',()=>{
 const {nodes:n,data}=setup();const item=data.items.find(p=>p.id==='VT003');assert.ok(item);assert.equal(data.items.filter(p=>p.id==='VT003').length,1);assert.ok(!data.items.some(p=>p.id==='demo-2'));assert.equal(item.price,300000);assert.equal(item.unit,'Trụ');assert.equal(item.images.length,6);assert.equal(item.advantages.length,6);
 for(const image of item.images){const bytes=fs.readFileSync(image.src);assert.equal(bytes.toString('ascii',8,12),'WEBP');}
 n['#material-search'].value='tru trong rau';n['#material-search'].events.input();n['#material-category'].value='Trụ khí canh';n['#material-category'].events.change();assert.match(n['#materials-count'].textContent,/1 \/ 1/);assert.ok(n['#materials-grid'].innerHTML.includes('</h3><p class="material-price">300.000đ</p>'));assert.ok(n['#materials-grid'].innerHTML.includes(item.image));
 n['#materials-grid'].events.click({target:{closest:()=>({dataset:{id:item.id}})}});const detail=n['#material-detail-content'];assert.equal(n['#material-detail'].open,true);assert.equal((detail.innerHTML.match(/data-gallery-index=/g)||[]).length,6);assert.equal((detail.innerHTML.match(/class="material-price"/g)||[]).length,1);assert.ok(detail.innerHTML.includes('</h2><p class="material-price">300.000đ</p>'));for(const value of Object.values(item.specifications))assert.ok(detail.innerHTML.includes(value));assert.ok(detail.innerHTML.includes('contact.html?material='+encodeURIComponent(item.name)+'#note'));assert.doesNotMatch(detail.innerHTML,/DEMO|Shopee|giá tham khảo|chưa xác nhận|Tình trạng:/i);
 const main={};const buttons=item.images.map((_,i)=>({dataset:{galleryIndex:String(i)},setAttribute(k,v){this[k]=v;}}));detail.querySelector=()=>main;detail.querySelectorAll=()=>buttons;buttons.forEach((button,i)=>{detail.events.click({target:{closest:()=>button}});assert.equal(main.src,item.images[i].src);});n.close.events.click();assert.equal(n['#material-detail'].open,false);
});

test('VT004 has exact sale price, four original images, gift accessories and working gallery',()=>{
 const {nodes:n,data}=setup();const item=data.items.find(p=>p.id==='VT004');assert.equal(data.items.filter(p=>p.id==='VT004').length,1);assert.equal(item.price,980000);assert.equal(item.unit,'Bộ');assert.equal(item.images.length,4);assert.equal(item.advantages.length,6);assert.equal(item.specifications['Quy cách'],'2 trụ/bộ');assert.equal(item.specifications['Phụ kiện tặng kèm'],'2 béc tưới, 2 nắp trụ');assert.ok(!Object.keys(item.specifications).some(k=>/đường kính|độ dày/i.test(k)));
 for(const image of item.images){const b=fs.readFileSync(image.src);assert.equal(b.toString('ascii',0,4),'RIFF');assert.equal(b.toString('ascii',8,12),'WEBP');}
 n['#material-search'].value='bo 2 tru';n['#material-search'].events.input();n['#material-category'].value='Trụ khí canh';n['#material-category'].events.change();assert.match(n['#materials-count'].textContent,/1 \/ 1/);assert.ok(n['#materials-grid'].innerHTML.includes(item.image));assert.ok(n['#materials-grid'].innerHTML.includes('</h3><p class="material-price">980.000đ</p>'));
 n['#materials-grid'].events.click({target:{closest:()=>({dataset:{id:item.id}})}});const detail=n['#material-detail-content'];assert.equal(n['#material-detail'].open,true);assert.equal((detail.innerHTML.match(/data-gallery-index=/g)||[]).length,4);assert.equal((detail.innerHTML.match(/class="material-price"/g)||[]).length,1);for(const value of Object.values(item.specifications))assert.ok(detail.innerHTML.includes(value));assert.ok(detail.innerHTML.includes('contact.html?material='+encodeURIComponent(item.name)+'#note'));assert.doesNotMatch(detail.innerHTML,/DEMO|Shopee|giá tham khảo|chưa xác nhận|Tình trạng:/i);
 const main={};const buttons=item.images.map((_,i)=>({dataset:{galleryIndex:String(i)},setAttribute(k,v){this[k]=v;}}));detail.querySelector=()=>main;detail.querySelectorAll=()=>buttons;buttons.forEach((button,i)=>{detail.events.click({target:{closest:()=>button}});assert.equal(main.src,item.images[i].src);});n.close.events.click();assert.equal(n['#material-detail'].open,false);
});
