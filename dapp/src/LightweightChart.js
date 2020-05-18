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
      { time: "2019-04-10", value: 60.01 },
      { time: "2019-04-11", value: 80.01 },
    ]);
  }

  componentWillUnmount() {
    if (this.chart !== null) {
      this.chart.remove();
      this.chart = null;
    }
  }

  render() {
    return <div id={this.props.containerId} className={"LightweightChart"} style={{width: "100%", height: "40vh"}} />;
  }
}
