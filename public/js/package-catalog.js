/* Shared public package catalog. Family/Rooftop are proposed configurations. */
(function (root, factory) {
  const catalog = factory();
  if (typeof module === 'object' && module.exports) module.exports = catalog;
  else root.VuonPhoPackageCatalog = catalog;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const priceNote = 'Giá áp dụng cho cấu hình cơ bản và điều kiện lắp đặt tiêu chuẩn. Chi phí phát sinh theo vị trí, vật tư và yêu cầu thi công sẽ được báo riêng trước khi thực hiện.';
  const areaNote = 'Diện tích mang tính tham khảo, chưa bao gồm lối đi và không gian thao tác; bố trí thực tế phụ thuộc điều kiện lắp đặt.';
  const products = [
    {name:'Mini Kit',layout_area:'Khoảng 0,6 m²',card_description:'Giải pháp khí canh nhỏ gọn cho ban công và căn hộ.',towers:4,holes:84,suitable_for:'Ban công, căn hộ nhỏ',size:'Theo phương án lắp đặt',price:3190000,price_label:'3.190.000đ',proposed:false,imageFile:'anh3',description:'4 trụ khí canh, 84 lỗ trồng. Phù hợp ban công, căn hộ nhỏ.',features:['4 trụ khí canh','84 lỗ trồng','Theo phương án lắp đặt']},
    {name:'Family Kit',layout_area:'Khoảng 1,2 m²',card_description:'Vườn rau khí canh dành cho gia đình, phù hợp không gian vừa.',towers:8,holes:168,suitable_for:'Gia đình, ban công rộng, sân vườn',size:'Theo phương án lắp đặt',price:5990000,price_label:'5.990.000đ',proposed:true,imageFile:'anh7',description:'Cấu hình đề xuất gồm 8 trụ khí canh, 168 lỗ trồng. Phù hợp gia đình, ban công rộng, sân vườn.',features:['8 trụ khí canh (cấu hình đề xuất)','168 lỗ trồng','Theo phương án lắp đặt']},
    {name:'Rooftop Kit',layout_area:'Khoảng 2,4 m²',card_description:'Hệ thống khí canh quy mô lớn dành cho sân thượng và sân vườn.',towers:16,holes:336,suitable_for:'Sân thượng, không gian rộng',size:'Theo phương án lắp đặt',price:11490000,price_label:'11.490.000đ',proposed:true,imageFile:'anh5',image:'public/images/installations/optimized/ban-cong-05.jpg',description:'Cấu hình đề xuất gồm 16 trụ khí canh, 336 lỗ trồng. Phù hợp sân thượng, không gian rộng.',features:['16 trụ khí canh (cấu hình đề xuất)','336 lỗ trồng','Theo phương án lắp đặt']}
  ];
  function apply(product) {
    if (!product) return product;
    const current = products.find(item => item.name === product.name);
    if (!current) return product;
    const {imageFile, ...fields} = current;
    return {...product, ...fields, features:JSON.stringify(current.features)};
  }
  return {products, apply, priceNote, areaNote};
});
