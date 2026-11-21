# Why we did this, and how

DataHub needed a line-chart library. We wanted to choose on evidence, so we built the same three charts in seven libraries and measured them. The picks are on the [front page](../index.html), and the [full verdict](./verdict) has the details.

## Why

Much of the data on DataHub is a time series: prices, emissions, energy, population. DataPressr, which renders DataHub's data stories, draws its charts with Observable Plot as static SVG when the page is built. We also need interactive charts: zoom into one week of a 17-year series, hover for a value, a million points that stay fast. We wanted to know whether one library could do both jobs, and if not, which two.

The comparisons we found did not answer that. Most list features and stop short of a recommendation. Benchmarks measure speed and nothing else. We could not find a page that put the same real data through each library and said which one to use.

So we made one. We have been comparing charting libraries for DataHub for about a decade; this is the 2026 round. The answer is that it depends on the job, and the [picks by job](../index.html#picks) say which library for which.

## What we chose for DataHub

We chose two. Data stories stay on Observable Plot: for a published chart with a sentence pointing at the data, it is the least code and the best result. Interactive and dense charts on DataHub will use Apache ECharts.

## How

- **Three kinds of line chart, on real data.** We looked at what people build line charts for and picked three kinds. The annotated chart in an article: EIA daily oil prices, 1986 to 2026, with callouts and recession bands. The dense interactive chart: NESO's half-hourly generation mix for Britain since 2009, 1.25 million points. The many-series chart: weekly npm downloads for 22 charting libraries. A side test with World Bank life expectancy, with years removed, checks how each library draws gaps.
- **One brief, seven builds.** Every library was built to the same written brief, with the same data loaders, colours and page shell, so the builds are easy to compare; differences still include our choices in each one. The source is under every chart. Line counts leave out the shared helpers for every library, and each library's own theme helper.
- **Numbers from scripts.** Render times are medians of six runs per chart on one MacBook Air (M4) in Chrome. Bundle sizes are the gzipped size of every file each page loads from the CDN. Both scripts are in the [repo](https://github.com/datasets/line-charts/tree/main/scripts/measure), and every demo page times itself again in your browser.
- **Who did what.** AI coding agents built the demos under our direction, one agent per library. We wrote the brief, chose the data, reviewed every chart against the requirements, reran the numbers and chose the picks. Agents drafted the prose and we edited it. A second AI model reviewed the site twice before launch, and we fixed what it found. Plot was built first, as the reference the brief was written against: a bias in Plot's favour, and we say so.

The brief, the data and how each number is measured: [Method](./method). What each library was like to build with: [Build notes](./build-notes).
