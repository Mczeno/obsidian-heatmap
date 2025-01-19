import { Plugin, MarkdownView, MarkdownRenderChild } from 'obsidian';
import type { HeatmapDataPoint } from './types';
import AppComponent from './components/App.svelte';

export default class HeatmapPlugin extends Plugin {

  private readableLineLength: boolean = false;
  private showLineNumber: boolean = false;
  private heatmaps: AppComponent[] = [];

  onload() {
    console.debug('loading HeatmapPlugin');

    this.readableLineLength = this.app.vault.getConfig("readableLineLength");
    this.showLineNumber = this.app.vault.getConfig("showLineNumber");

    this.registerMarkdownCodeBlockProcessor('heatmap', (src, el, ctx) => {
      const dataPoints = this.getHeatmapDataPoints();
      const width = this.getEditorWidth();
      const fontColor = this.getThemeFontColor();
      const fontSize = this.getFontSize();

      const heatmap = new AppComponent({
        target: el,
        props: {
          dataPoints,
          width,
          fontColor,
          fontSize,
        },
      });
      this.heatmaps.push(heatmap);

      const child = new MarkdownRenderChild(el);
      child.onunload = () => {
        const index = this.heatmaps.indexOf(heatmap);
        if (index > -1) {
          this.heatmaps.splice(index, 1);
        }
        heatmap.$destroy();
        console.debug('this heatmap unloaded');
      };
      ctx.addChild(child);
    });

    // Register theme change listener
    this.registerEvent(
      this.app.workspace.on('css-change', () => {
        console.debug("css-change!");
        this.refreshHeatmaps();
      })
    );

    // Register layout change listener
    this.registerEvent(
      this.app.workspace.on('resize', () => {
        console.debug("resize!");
        this.refreshHeatmaps();
      })
    );

    // Register config change listener
    this.registerEvent(
      this.app.vault.on("config-changed", () => {
        console.debug("config-changed!");
        // 缩减栏宽配置切换
        const newReadableLineLength = this.app.vault.getConfig("readableLineLength");
        const newShowLineNumber = this.app.vault.getConfig("showLineNumber");
        if (this.readableLineLength !== newReadableLineLength || this.showLineNumber !== newShowLineNumber) {
          this.readableLineLength = newReadableLineLength;
          this.showLineNumber = newShowLineNumber;
          this.refreshHeatmaps();
        }
      })
    );
  }

  onunload() {
    console.debug('unloading plugin');
    this.heatmaps.forEach(heatmap => heatmap.$destroy());
    this.heatmaps = [];
  }

  // 获取当前编辑器的宽度
  private getEditorWidth(): number {
    const activeLeaf = this.app.workspace.getLeaf();
    if (!(activeLeaf.view instanceof MarkdownView)) {
      return 0;
    }

    const containerEl = activeLeaf.view.containerEl;
    const dataMode = containerEl.getAttribute('data-mode');
    const viewClass = dataMode === 'preview' ? '.markdown-preview-sizer' : '.cm-content';
    const content = containerEl.querySelector(viewClass);
    return content?.getBoundingClientRect().width ?? 0;
  }

  // 获取当前主题的字体颜色
  private getThemeFontColor(): string {
    return window.getComputedStyle(document.body).getPropertyValue('--text-normal').trim();
  }

  // 获取当前字体大小
  private getFontSize(): number {
    return this.app.vault.getConfig("baseFontSize") ?? 14;
  }

  // 获取 Heatmap 数据
  private getHeatmapDataPoints(): HeatmapDataPoint[] {
    // 设置日期范围
    const endDate = new Date(); // 当前日期
    const startDate = new Date(endDate);
    startDate.setFullYear(startDate.getFullYear() - 1); // 一年前的日期

    // 生成 Heatmap 数据
    const heatmapData = this.generateRandomData(startDate, endDate);
    return heatmapData;
  }

  // 生成随机数据的函数
  private generateRandomData(startDate: Date, endDate: Date): HeatmapDataPoint[] {
    const data: HeatmapDataPoint[] = [];
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      data.push({
        date: new Date(currentDate), // 创建新的 Date 对象避免引用问题
        count: Math.floor(Math.random() * 20), // 生成 0-29 之间的随机整数
      });
      currentDate.setDate(currentDate.getDate() + 1); // 移到下一天
    }
    return data;
  }

  // 刷新 Heatmap
  private refreshHeatmaps() {
    this.heatmaps.forEach(heatmap => {
      heatmap.refreshSVG(
        this.getHeatmapDataPoints(),
        this.getEditorWidth(),
        this.getThemeFontColor(),
        this.getFontSize(),
      );
    });
  }

}