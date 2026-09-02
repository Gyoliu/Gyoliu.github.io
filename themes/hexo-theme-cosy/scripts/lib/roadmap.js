function toArray(value) {
  if (!value) return [];
  return typeof value.toArray === "function" ? value.toArray() : Array.from(value);
}

function categoryPath(post) {
  const names = toArray(post.categories)
    .map((category) => category.name)
    .filter(Boolean);
  return names.length ? names.join(" / ") : "未分类";
}

function buildRoadmap(posts) {
  const groupedByYear = new Map();

  toArray(posts).forEach((post) => {
    if (!post.date || typeof post.date.format !== "function") return;

    const year = post.date.format("YYYY");
    const item = {
      title: post.title || "无标题",
      date: post.date.format("MM-DD"),
      category: categoryPath(post),
    };

    if (!groupedByYear.has(year)) groupedByYear.set(year, []);
    groupedByYear.get(year).push(item);
  });

  const years = {};
  const sortedYears = [...groupedByYear.keys()].sort();

  sortedYears.forEach((year) => {
    const postsInYear = groupedByYear.get(year);
    const categories = new Map();

    postsInYear.forEach((post) => {
      if (!categories.has(post.category)) categories.set(post.category, []);
      categories.get(post.category).push(post);
    });

    const categorySummary = [...categories.entries()]
      .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
      .map(([name, items]) => `${name}×${items.length}`)
      .join(" · ");

    years[year] = [
      {
        title: `${year} 博客概览（${postsInYear.length} 篇）`,
        start: "01-01",
        end: "12-31",
        content: categorySummary,
      },
      ...[...categories.entries()]
        .sort(([a], [b]) => a.localeCompare(b, "zh-CN"))
        .map(([name, items]) => {
          const sortedItems = items.sort((a, b) => a.date.localeCompare(b.date));
          const unit = name === "动态" ? "条" : "篇";
          const titles = sortedItems.map((item) => item.title);

          return {
            title: `[${name}] ${sortedItems.length} ${unit}`,
            start: sortedItems[0].date,
            end: sortedItems[sortedItems.length - 1].date,
            content:
              titles.slice(0, 5).join("、") +
              (titles.length > 5 ? ` 等 ${titles.length} ${unit}` : ""),
          };
        }),
    ];
  });

  return {
    initYear: sortedYears.at(-1) || "",
    years,
  };
}

module.exports = { buildRoadmap };
