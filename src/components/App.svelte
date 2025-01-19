<script lang="ts">
  import { onMount } from "svelte";
  import { scaleLinear } from "d3-scale";
  import { timeDays, timeMonth, timeMonday } from "d3-time";
  import { timeFormat } from "d3-time-format";
  import type { HeatmapDataPoint } from "../types";

  export let dataPoints: HeatmapDataPoint[] = [];
  export let width: number = 888;
  export let fontColor: string = "#666";
  export let fontSize: number = 14;

  let svgRef: SVGSVGElement;
  let containerRef: HTMLDivElement;
  let tooltipRef: HTMLDivElement;

  // 定义一个中文月份映射类型
  type ChineseMonths = {
    [key: string]: string;
  };
  // 中文月份映射
  const chineseMonths: ChineseMonths = {
    Jan: "1月",
    Feb: "2月",
    Mar: "3月",
    Apr: "4月",
    May: "5月",
    Jun: "6月",
    Jul: "7月",
    Aug: "8月",
    Sep: "9月",
    Oct: "10月",
    Nov: "11月",
    Dec: "12月",
  };
  const dayCount = 7;
  const cellGap = 3;
  const tooltip = {
    init(el: HTMLDivElement) {
      tooltipRef = el;
    },

    show(content: string, cellX: number, cellY: number) {
      tooltipRef.textContent = content;
      tooltipRef.style.visibility = "visible";
      tooltipRef.style.display = "block";

      // 计算 tooltip 的位置
      const svgRect = svgRef.getBoundingClientRect();
      const tooltipWidth = tooltipRef.clientWidth;

      let adjustedX = cellX - svgRect.x;
      const isNearLeftEdge = adjustedX - tooltipWidth / 2 < 0;
      const isNearRightEdge = adjustedX + tooltipWidth / 2 > svgRect.width;
      if (isNearLeftEdge) {
        adjustedX = tooltipWidth / 2;
      } else if (isNearRightEdge) {
        adjustedX = svgRect.width - tooltipWidth / 2;
      }

      const tooltipHeight = tooltipRef.clientHeight;
      let adjustedY = cellY - svgRect.y - tooltipHeight - cellGap + 1;
      tooltipRef.style.left = `${adjustedX}px`;
      tooltipRef.style.top = `${adjustedY}px`;
    },

    hide() {
      tooltipRef.style.visibility = "hidden";
    },
  };

  let height = 0; // 声明 height 变量，稍后会计算它的值
  let cellSize = fontSize; // 默认值，稍后会根据数据计算

  // 组件挂载时的逻辑
  onMount(() => {
    generateSVG();
    tooltip.init(tooltipRef);
    console.debug("Heatmap component mounted");
  });

  export function refreshSVG(
    newDataPoints: HeatmapDataPoint[],
    newWidth: number,
    newFontColor: string,
    newFontSize: number,
  ): void {
    if (newWidth <= 0) {
      console.debug("newWidth illegal!", newWidth);
      return;
    }
    dataPoints = newDataPoints;
    width = newWidth;
    fontColor = newFontColor;
    fontSize = newFontSize;
    generateSVG();
  }

  function generateSVG() {
    // 清空 SVG 元素
    svgRef.innerHTML = "";

    if (!dataPoints || dataPoints.length === 0) {
      console.error("Heatmap no data available");
      return;
    }

    // 确定日期范围，将开始日期调整到最近的周一
    const dates = dataPoints.map((d) => d.date);
    const startDate: Date = dates[0];
    const endDate: Date = dates[dates.length - 1];
    const weekCount =
      timeMonday.count(timeMonday.floor(startDate), timeMonday.floor(endDate)) +
      1;

    // 通过输入的宽度，计算单元格大小和边距
    cellSize = (width - (weekCount - 1) * cellGap) / (weekCount + 2);
    cellSize = Math.min(cellSize, 14);
    const margin = {
      top: cellSize * 3.5,
      right: 0,
      bottom: 0,
      left: 0,
    };

    // 计算 Heatmap SVG 的高度
    height = (dayCount + 3.5 + 2) * cellSize + (dayCount - 1) * cellGap;

    // 创建一个 SVG group 元素来容纳所有的单元格
    const svgGroup = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    svgGroup.setAttribute(
      "transform",
      `translate(${margin.left}, ${margin.top})`,
    );

    // 将所有创建的元素添加到 SVG 中
    svgGroup.appendChild(generateYearLegendSVG());
    svgGroup.appendChild(generateMonthLabelsSVG(startDate, endDate));
    svgGroup.appendChild(generateWeekLabelsSVG(weekCount));
    svgGroup.appendChild(generateCellsSVG(startDate, endDate));

    svgRef.appendChild(svgGroup);

    console.debug("生成 SVG 完成，width：", width, "height：", height);
  }

  /**
   * 生成年度汇总标签
   */
  function generateYearLegendSVG(): SVGGElement {
    // 年度汇总
    const yearLegendSVG = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "text",
    );
    let yearCount = dataPoints.reduce((sum, d) => sum + d.count, 0);
    yearLegendSVG.textContent = "最近一年记录 " + yearCount + " 条笔记";
    yearLegendSVG.setAttribute("y", (-cellSize * 2).toString());
    yearLegendSVG.setAttribute("font-size", (cellSize * 1.5).toString());
    yearLegendSVG.setAttribute("font-weight", "bold");
    yearLegendSVG.setAttribute("fill", fontColor);

    return yearLegendSVG;
  }

  /**
   * 生成月份标签
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  function generateMonthLabelsSVG(startDate: Date, endDate: Date): SVGGElement {
    const monthLabels: Date[] = timeMonth.range(startDate, endDate);
    const monthLabelsSVG = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    const monthLabelY = (dayCount + 2) * cellSize + (dayCount - 2) * cellGap;
    monthLabels.forEach((date) => {
      const monthLabel = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      const englishMonth = timeFormat("%b")(date);
      monthLabel.textContent = chineseMonths[englishMonth] || englishMonth;

      // 调整月份标签位置，因为周一被调整为第一行
      const adjustTimeWeekCount =
        // date.getDay() === 0
        // ? timeMonday.count(timeMonday.floor(startDate), timeMonday(date)) - 1
        // : timeMonday.count(timeMonday.floor(startDate), timeMonday(date));
        timeMonday.count(timeMonday.floor(startDate), timeMonday.floor(date));
      monthLabel.setAttribute(
        "x",
        `${adjustTimeWeekCount * (cellSize + cellGap)}`,
      );
      monthLabel.setAttribute("y", monthLabelY.toString());
      monthLabel.setAttribute("font-size", (cellSize - 1).toString());
      monthLabel.setAttribute("fill", fontColor);
      monthLabelsSVG.appendChild(monthLabel);
    });

    return monthLabelsSVG;
  }

  /**
   * 生成星期标签
   * @param weekCount 周数
   */
  function generateWeekLabelsSVG(weekCount: number): SVGGElement {
    // 创建并添加星期标签
    const weekDays = ["一", "三", "五", "日"];
    const weekLabelsSVG = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );
    const weekLabelX = cellSize * (weekCount + 2) + cellGap * (weekCount - 1);
    weekDays.forEach((day, index) => {
      const weekLabel = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      weekLabel.textContent = day;
      weekLabel.setAttribute("x", weekLabelX.toString());
      weekLabel.setAttribute(
        "y",
        `${(index * 2 + 0.5) * (cellSize + cellGap)}`,
      );
      weekLabel.setAttribute("text-anchor", "end");
      weekLabel.setAttribute("alignment-baseline", "middle");
      weekLabel.setAttribute("font-size", (cellSize - 1).toString());
      weekLabel.setAttribute("fill", fontColor);
      weekLabelsSVG.appendChild(weekLabel);
    });

    return weekLabelsSVG;
  }

  /**
   * 生成单元格
   * @param startDate 开始日期
   * @param endDate 结束日期
   */
  function generateCellsSVG(startDate: Date, endDate: Date): SVGGElement {
    const cellsSVG: SVGGElement = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "g",
    );

    // 为每一天创建一个单元格对象，包含位置、颜色和数据信息。
    timeDays(startDate, endDate)
      .map((date: Date) => {
        const week = timeMonday.count(
          timeMonday.floor(startDate),
          timeMonday.floor(date),
        );
        // 调整 day 计算，使周一为 0
        const day = (date.getDay() + 6) % 7;
        const dataPoint = dataPoints.find(
          (d) => d.date.toDateString() === date.toDateString(),
        );
        const count = dataPoint ? dataPoint.count : 0;

        return {
          x: week * (cellSize + cellGap),
          y: day * (cellSize + cellGap),
          fill: colorScale(count),
          date,
          count,
        };
      })
      // 创建每个单元格的 SVG 矩形元素，设置其属性，并添加鼠标事件监听器
      .forEach((cell: any) => {
        const rect = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "rect",
        );
        rect.setAttribute("x", `${cell.x}`);
        rect.setAttribute("y", `${cell.y}`);
        rect.setAttribute("width", `${cellSize}`);
        rect.setAttribute("height", `${cellSize}`);
        rect.setAttribute("fill", cell.fill);
        rect.setAttribute("rx", "2");
        rect.setAttribute("ry", "2");

        rect.addEventListener("mouseover", (event) => {
          const target = event.target as SVGRectElement;
          const targetRect = target.getBoundingClientRect();
          const content = `${cell.count} 条笔记于 ${cell.date.toLocaleDateString()}`;
          tooltip.show(content, targetRect.x, targetRect.y);
        });

        rect.addEventListener("mouseout", () => {
          tooltip.hide();
        });

        cellsSVG.appendChild(rect);
      });

    return cellsSVG;
  }

  // 颜色比例尺，这是一个响应式声明，会根据 data 的变化自动更新
  $: colorScale = scaleLinear<string>()
    .domain([
      0,
      Math.max(...dataPoints.map((d) => d.count), 10) / 2,
      Math.max(...dataPoints.map((d) => d.count)),
    ])
    .range(["#ebedf0", "#7bc96f", "#196127"])
    .clamp(true);
</script>

<div bind:this={containerRef} class="hm-container">
  <svg bind:this={svgRef} {width} {height} class="hm-svg"></svg>
  <div bind:this={tooltipRef} class="hm-tooltip" style="display: none;"></div>
</div>

<style>
  .hm-container {
    position: relative;
    width: 100%;
    display: block;
    justify-content: center;
  }

  .hm-svg {
    max-width: 100%;
    height: auto;
  }

  .hm-tooltip {
    position: absolute;
    box-shadow: 0 2px 8px var(--background-modifier-box-shadow);
    background-color: var(--background-modifier-message);
    border-radius: var(--radius-s);
    color: #fafafa;
    line-height: var(--line-height-tight);
    font-size: var(--font-ui-smaller);
    font-weight: var(--font-medium);
    padding: 4px 8px;
    pointer-events: none;
    z-index: 1000;
    white-space: nowrap;
    transition:
      opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      left 0.2s cubic-bezier(0.4, 0, 0.2, 1),
      top 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    animation: pop-down 200ms forwards ease-in-out;
    transform: translateX(-50%);
    text-align: center;
  }
</style>
