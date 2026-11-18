(function () {
  "use strict";

  const section = document.getElementById("san-luong");
  if (!section) return;

  const harvestData = window.VuonPhoHarvestCrops;
  const packages = window.VuonPhoPackageCatalog?.products;
  if (!harvestData?.crops.length || !packages?.length) return;

  const { crops, sources } = harvestData;
  const byId = (id) => document.getElementById(id);
  const tool = byId("harvest-tool");
  const cropSelect = byId("harvest-crop");
  const kitSelect = byId("harvest-kit");
  const holes = byId("harvest-hole-count");
  const holeLimit = byId("harvest-hole-limit");
  const people = byId("harvest-people");
  const portion = byId("harvest-portion");
  const rate = byId("harvest-rate");
  const weeklyOutput = byId("harvest-weekly");
  const mealMass = byId("harvest-meal-mass");
  const mealsOutput = byId("harvest-meals");
  const yieldCondition = byId("harvest-condition");
  const estimateType = byId("harvest-estimate-type");
  const portionNote = byId("harvest-portion-note");
  const trialMass = byId("harvest-trial-mass");
  const sourceList = byId("harvest-sources");
  const reference = byId("harvest-reference");

  const whole = new Intl.NumberFormat("vi-VN");
  const preciseWeight = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 3 });
  const cropMass = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 1 });
  const packagesByName = new Map(packages.map((kit) => [kit.name, kit]));
  const cropsById = new Map(crops.filter((crop) => crop.id).map((crop) => [crop.id, crop]));
  const groups = new Map();
  let plantedShare = 0.5;

  function appendElement(parent, tag, text) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    parent.append(element);
    return element;
  }

  function appendSource(parent, key, label) {
    const [name, url] = sources[key];
    const link = appendElement(parent, "a", label || name);
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
  }

  function formatRange(values, formatter) {
    const lower = formatter.format(values[0]);
    const upper = formatter.format(values[values.length - 1]);
    return lower === upper ? lower : lower + "–" + upper;
  }

  function renderReference() {
    for (const [group, entries] of groups) {
      appendElement(reference, "h3", group);
      const table = appendElement(reference, "table");
      table.className = "harvest-table";
      table.setAttribute("aria-label", group);
      const header = appendElement(appendElement(table, "thead"), "tr");
      for (const label of ["Loại rau", "Số liệu", "Nguồn"]) {
        appendElement(header, "th", label).scope = "col";
      }

      const rows = appendElement(table, "tbody");
      for (const crop of entries) {
        const row = appendElement(rows, "tr");
        appendElement(row, "th", crop.name).scope = "row";
        const description = [crop.metric, crop.extraMetric, crop.assumption].filter(Boolean).join(" ");
        appendElement(row, "td", description);
        const citation = appendElement(row, "td");
        appendSource(citation, crop.study);
        if (crop.extraStudy) {
          appendElement(citation, "br");
          appendSource(citation, crop.extraStudy);
        }
      }
    }
  }

  function updateCrop() {
    const crop = cropsById.get(cropSelect.value);
    portion.value = crop.portion;
    const portionGrams = whole.format(crop.portion) + " g/người";
    portionNote.textContent = crop.recipe
      ? portionGrams + " theo một công thức món ăn. Có thể chỉnh theo khẩu phần nhà bạn."
      : portionGrams + " là mức gợi ý cho món dùng loại rau này. Có thể chỉnh theo khẩu phần nhà bạn.";

    const yieldInput = formatRange(crop.grams, cropMass) + " g/lỗ trong " + whole.format(crop.days) + " ngày.";
    trialMass.textContent = [crop.metric, "Đầu vào bộ tính " + yieldInput, crop.assumption].filter(Boolean).join(" ");
    estimateType.textContent = crop.assumption
      ? "Mô phỏng · " + crop.assumption
      : "Ước tính theo thí nghiệm khí canh. Sản lượng trên giàn Vườn Phố cần được cân thực tế.";
    sourceList.replaceChildren();
    appendSource(sourceList, crop.study);
    if (crop.extraStudy) appendSource(sourceList, crop.extraStudy);
    if (crop.recipe) appendSource(sourceList, crop.recipe, "Công thức tham khảo · " + sources[crop.recipe][0]);
    render();
  }

  function updateKit() {
    const kit = packagesByName.get(kitSelect.value);
    holes.max = kit.holes;
    holes.value = Math.max(1, Math.round(plantedShare * kit.holes));
    render();
  }

  function updateHoles() {
    if (holes.validity.valid) {
      plantedShare = holes.valueAsNumber / packagesByName.get(kitSelect.value).holes;
    }
    render();
  }

  function render() {
    const crop = cropsById.get(cropSelect.value);
    const kit = packagesByName.get(kitSelect.value);
    const mealGrams = people.valueAsNumber * portion.valueAsNumber;
    const mealValid = people.validity.valid && portion.validity.valid && Number.isSafeInteger(mealGrams);
    const holesValid = holes.validity.valid;
    const harvestValid = holesValid && rate.validity.valid;
    const capacity = whole.format(kit.holes);

    mealMass.textContent = mealValid ? whole.format(mealGrams) + " g" : "Nhập số người và gram";
    holes.setAttribute("aria-invalid", String(!holesValid));
    holeLimit.textContent = holesValid
      ? kit.name + " có " + capacity + " lỗ. Đổi gói sẽ giữ tỷ lệ lỗ đang dùng."
      : "Nhập số nguyên từ 1 đến " + capacity + " lỗ hoặc chọn gói lớn hơn.";
    weeklyOutput.classList.toggle("harvest-result-error", !harvestValid);

    if (!harvestValid) {
      weeklyOutput.textContent = holesValid ? "Kiểm tra tỷ lệ cây cho thu" : "Kiểm tra số lỗ đã nhập";
      yieldCondition.textContent = "Kiểm tra số lỗ và tỷ lệ cây cho thu.";
      mealsOutput.textContent = "";
      return;
    }

    yieldCondition.textContent = whole.format(holes.valueAsNumber) + " lỗ · " +
      whole.format(rate.valueAsNumber) + "% cây cho thu · trồng gối lứa.";
    const harvestPerHole = crop.grams.map((mass) => mass * (rate.valueAsNumber / 100) * 7 / crop.days);
    const gramsPerWeek = harvestPerHole.map((mass) => mass * holes.valueAsNumber);
    const largestChangePerHole = harvestPerHole[harvestPerHole.length - 1];
    const showGrams = largestChangePerHole > 0 && largestChangePerHole < 1;
    const amounts = showGrams ? gramsPerWeek : gramsPerWeek.map((mass) => mass / 1000);
    weeklyOutput.textContent = "≈ " + formatRange(amounts, preciseWeight) + (showGrams ? " g/tuần" : " kg/tuần");

    if (!mealValid) {
      mealsOutput.textContent = "Nhập số người và khẩu phần để quy đổi ra số bữa.";
      return;
    }

    const meals = formatRange(gramsPerWeek.map((mass) => Math.floor(mass / mealGrams)), whole);
    mealsOutput.textContent = meals === "0"
      ? "Lượng rau bình quân tuần chưa đủ một bữa theo khẩu phần đã chọn."
      : "Tương đương " + meals + " bữa rau/tuần cho nhà " + whole.format(people.valueAsNumber) + " người.";
  }

  for (const crop of crops) {
    if (!groups.has(crop.group)) groups.set(crop.group, []);
    groups.get(crop.group).push(crop);
  }
  for (const [group, entries] of groups) {
    const selectable = entries.filter((crop) => crop.id);
    if (!selectable.length) continue;
    const options = appendElement(cropSelect, "optgroup");
    options.label = group;
    for (const crop of selectable) appendElement(options, "option", crop.name).value = crop.id;
  }
  for (const kit of packages) {
    appendElement(kitSelect, "option", kit.name + " · " + whole.format(kit.holes) + " lỗ").value = kit.name;
  }
  cropSelect.value = cropsById.keys().next().value;
  kitSelect.value = packages[0].name;
  renderReference();
  updateKit();
  updateCrop();
  tool.hidden = false;

  cropSelect.addEventListener("change", updateCrop);
  kitSelect.addEventListener("change", updateKit);
  holes.addEventListener("input", updateHoles);
  holes.addEventListener("change", updateHoles);
  for (const input of [people, portion, rate]) input.addEventListener("input", render);
})();
