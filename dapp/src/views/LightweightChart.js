import * as React from "react";
import { createChart } from "lightweight-charts";

export default class LightweightChart extends React.PureComponent {
  static defaultProps = {
    containerId: "lightweight_chart_container",
  };

  chart = null;

  componentDidMount() {
    const chart = createChart(this.props.containerId);
    this.chart = chart;

    const lineSeries = chart.addLineSeries();

    lineSeries.setData([
      { time: "2019-04-01", value: 60.01 },
      { time: "2019-04-02", value: 80.01 },
      { time: "2019-04-03", value: 62.01 },
      { time: "2019-04-04", value: 69.01 },
      { time: "2019-04-05", value: 61.01 },
      { time: "2019-04-06", value: 60.01 },
      { time: "2019-04-07", value: 67.01 },
      { time: "2019-04-08", value: 69.01 },
      { time: "2019-04-09", value: 75.01 },
      { time: "2019-04-10", value: 81.01 },
      { time: "2019-04-11", value: 64.01 },
      { time: "2019-04-12", value: 60.01 },
      { time: "2019-04-13", value: 61.01 },
      { time: "2019-04-14", value: 62.01 },
      { time: "2019-04-15", value: 64.01 },
      { time: "2019-04-16", value: 60.01 },
      { time: "2019-04-17", value: 63.01 },
      { time: "2019-04-18", value: 60.01 },
      { time: "2019-04-19", value: 80.01 },
      { time: "2019-04-20", value: 62.01 },
      { time: "2019-04-21", value: 69.01 },
      { time: "2019-04-22", value: 61.01 },
      { time: "2019-04-23", value: 60.01 },
      { time: "2019-04-24", value: 67.01 },
      { time: "2019-04-25", value: 69.01 },
      { time: "2019-04-26", value: 75.01 },
      { time: "2019-04-27", value: 81.01 },
      { time: "2019-04-28", value: 64.01 },
      { time: "2019-04-29", value: 60.01 },
      { time: "2019-04-30", value: 61.01 },
    ]);
  }

  componentWillUnmount() {
    if (this.chart !== null) {
      this.chart.remove();
      this.chart = null;
    }
  }

  render() {
    return (
      <div
        id={this.props.containerId}
        className={"LightweightChart"}
        style={{ width: "100%", height: "40vh" }}
      />
    );
  }
}
