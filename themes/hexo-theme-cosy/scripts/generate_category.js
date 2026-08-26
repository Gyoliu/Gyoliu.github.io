hexo.extend.helper.register("generate_category", function (categories) {
  const category_meta = hexo.theme.config["category_meta"] ?? {};
  const category_order = hexo.theme.config["category_order"] ?? [];

  const sorted = categories.toArray().sort((a, b) => {
    const ia = category_order.indexOf(a.name);
    const ib = category_order.indexOf(b.name);
    if (ia === -1 && ib === -1) return a.name.localeCompare(b.name, "zh-CN");
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  let result = "<ul>";
  sorted.forEach((category) => {
    const categoryMeta = category_meta[category.name] ?? "";
    const isActive =
      (this.page.category && this.page.category === category.name) ||
      (this.page.categories &&
        this.page.categories.some((cat) => cat.name === category.name));

    if (categoryMeta !== false) {
      result += `<li class="${isActive ? "active" : ""}">
        <a href="${this.url_for(category.path)}">
          ${categoryMeta}
          <div class="ellipsis">
            <span>${category.name}</span>
          </div>
        </a>
      </li>`;
    }
  });

  result += "</ul>";
  return result;
});
