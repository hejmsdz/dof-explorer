(function() {
  "use strict";
  // optical computation
  function hyperfocal(focal, aperture, coc) {
    return focal + Math.pow(focal, 2) / (aperture * coc);
  }

  function limits(focal, subject, hyperfocal) {
    let hs = hyperfocal * subject;
    let sf = subject - focal;
    let inf = hyperfocal < (subject - focal);
    return [
      hs / (hyperfocal + sf),
      inf ? Infinity : hs / (hyperfocal - sf)
    ];
  }

  function circleOfConfusion(diagonal) {
    const divisor = 1500;
    return diagonal / divisor;
  }

  // utilities
  function mm(x) {
    return x / 1000;
  }

  function Multivariable(focal, aperture, subject, coc) {
    this.focal = focal;
    this.aperture = aperture;
    this.subject = subject;
    this.coc = coc;

    this.hyperfocal = function() {
      return hyperfocal(mm(this.focal), this.aperture, mm(this.coc));
    };

    this.limits = function() {
      return limits(mm(this.focal), this.subject, this.hyperfocal());
    };

    this.total = function() {
      let lims = this.limits();
      if (lims[0] > lims[1]) {
        return undefined;
      }
      return lims[1] - lims[0];
    };

    this.setAndGet = function(input, output) {
      let that = this;
      return function(val) {
        let copy = Object.create(that);
        copy[input] = val;
        return copy[output]();
      };
    };
  }

  function range(low, high, step = 1) {
    return Array.from(Array((high - low) / step).keys())
      .map(x => x * step + low);
  }

  function rangeIncl(low, high, step = 1) {
    return range(low, high, step).concat(high);
  }

  function roundSignificant(number, digits = 3) {
    let allDigits = Math.floor(Math.log10(number)) + 1;
    let factor = Math.pow(10, digits - allDigits);
    return Math.round(factor * number) / factor;
  }

  function formatLength(meters) {
    let rounded, unit = 'm';
    if (meters >= 1000) {
      rounded = Math.round(meters);
      unit = 'km';
    } else if (meters >= 1) {
      rounded = roundSignificant(meters);
    } else {
      unit = 'cm';
      rounded = Math.round(meters * 100);
    }

    return [rounded.toString().substr(0, 4), unit].join('&nbsp;');
  }

  function plot(x, y, params) {
    const xAxes = {
      aperture: {
        type: 'log',
        title: 'aperture',
        tickvals: fStops.filter((val, i) => i % 3 == 0),
        fixedrange: true
      },
      focal: {
        title: 'focal length [mm]',
        fixedrange: true
      },
      subject: {
        title: 'subject distance [m]',
        fixedrange: true
      },
    };

    const yAxes = {
      limits: {
        title: 'distance [m]',
        range: [0, 300],
        fixedrange: true
      },
      hyperfocal: {
        title: 'hyperfocal distance [m]',
        fixedrange: true
      },
      total: {
        title: 'total depth of field [m]',
        range: [0, 100],
        fixedrange: true
      }
    };

    let func = new Multivariable(
      params.focal, params.aperture, params.subject, params.coc
    ).setAndGet(x, y);

    let xSeries;
    switch (x) {
      case 'aperture':
        xSeries = fStops;
        break;
      case 'focal':
        let focalRangeLims;
        switch (params.focalRange) {
          case 'wide':
            focalRangeLims = [10, 28];
            break;
          case 'normal':
            focalRangeLims = [24, 100];
            break;
          case 'tele':
            focalRangeLims = [80, 300];
            break;
        }
        xSeries = rangeIncl(...focalRangeLims.map(f => Math.round(f / params.crop)));
        break;
      case 'subject':
        switch (params.subjectRange) {
          case 'near':
            xSeries = rangeIncl(0.1, 1, 0.1);
            break;
          case 'normal':
            xSeries = rangeIncl(1, 5, 0.05);
            break;
          case 'far':
            xSeries = rangeIncl(5, 10, 0.1);
            break;
          case 'super-far':
            xSeries = rangeIncl(10, 100);
            break;
        }
        break;
    }

    let ySeries = xSeries.map(func);
    let xAxis = xAxes[x];
    let yAxis = yAxes[y];

    let traces = [
      {
        x: xSeries,
        y: ySeries,
        line: {shape: 'spline'},
        hoverinfo: 'x+text',
        mode: 'lines'
      }
    ];

    if (y == 'limits') {
      let near = traces[0].y.map(x => x[0]);
      let far = traces[0].y.map(x => x[1]);
      traces[0].y = near;
      traces[0].fill = 'none';
      traces.push(Object.create(traces[0]));
      traces[1].y = far;
      traces[1].fill = 'tonexty';
    }

    if ('range' in yAxis) {
      yAxis.range[1] = Math.min(
        Math.max.apply(null, traces[traces.length - 1].y.filter(x => isFinite(x))),
        yAxis.range[1]
      );
    }

    traces.forEach(trace => trace.text = trace.y.map(formatLength));

    return {
      traces: traces,
      options: {
        margin: { t: 20, b: 35, l: 45, r: 20 },
        xaxis: xAxis,
        yaxis: yAxis,
        font: { family: 'Lato' },
        showlegend: false
      }
    };
  }

  // data
  const sensorSizes = [
    {symbol: 'full frame', crop: 1, diagonal: 43.2},
    {symbol: 'APS-C', crop: 1.53, diagonal: 28.3},
    {symbol: 'Canon APS-C', crop: 1.61, diagonal: 26.82},
    {symbol: 'Four Thirds', crop: 2, diagonal: 22.5},
    {symbol: '1 inch', crop: 2.72, diagonal: 15.86},
    {symbol: '1/2.3 inch', crop: 5.64, diagonal: 7.66},
    {symbol: '1/3 inch', crop: 7.21, diagonal: 6},
  ];

  const fStops = [
    1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5,
    5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32
  ];

  let defaultSensorIndex = 0;
  if ('localStorage' in window) {
    defaultSensorIndex = parseInt(localStorage.sensorIndex) || 0;
  }

  // vue
  const app = new Vue({
    el: '#app',
    data: {
      sensorSizes: sensorSizes,
      fStops: fStops,
      // defaults
      sensorIndex: defaultSensorIndex,
      yPlot: 'total',
      xPlot: 'aperture',
      xFocalRange: 'normal',
      xSubjectRange: 'normal',
      fStop: 6,
      logFocalEquiv: 1.7,
      logSubject: 0.3,
    },
    computed: {
      sensor: function() {
        return sensorSizes[this.sensorIndex];
      },
      focalEquiv: function() {
        return Math.min(Math.round(Math.pow(10, this.logFocalEquiv)), 300);
      },
      focal: function() {
        return Math.round(this.focalEquiv / this.sensor.crop);
      },
      aperture: function() {
        return fStops[this.fStop];
      },
      subject: function() {
        return Math.round(100 * Math.pow(10, this.logSubject)) / 100;
      }
    },
    watch: {
      sensorIndex: function(value) {
        if ('localStorage' in window) {
          localStorage.sensorIndex = value;
        }

        this.plot();
      },
      yPlot: function(value) {
        if (value == 'hyperfocal' && this.xPlot == 'subject') {
          this.xPlot = 'aperture';
        }
        this.plot();
      },
      xPlot: function() {
        this.plot();
      },
      xFocalRange: function() {
        this.plot();
      },
      xSubjectRange: function() {
        this.plot();
      },
      fStop: function() {
        this.plot();
      },
      focalEquiv: function() {
        this.plot();
      },
      subject: function() {
        this.plot();
      }
    },
    methods: {
      formatLength: formatLength,
      plot: function() {
        const plotDiv = document.getElementById('plot');

        let plotConfig = plot(this.xPlot, this.yPlot, {
          crop: this.sensor.crop,
          focal: this.focal,
          aperture: this.aperture,
          subject: this.subject,
          coc: circleOfConfusion(this.sensor.diagonal),
          crop: this.sensor.crop,
          focalRange: this.xFocalRange,
          subjectRange: this.xSubjectRange,
        });

        Plotly.purge(plotDiv);
        Plotly.plot(plotDiv, plotConfig.traces, plotConfig.options,
          {
            displayModeBar: false,
            scrollZoom: false
          }
        );
      },
      keep: function() {
        //
      }
    }
  });

  // on ready
  app.plot();

  // auto resize
  window.addEventListener('resize', function() {
    Plotly.Plots.resize(
      Plotly.d3
        .select('#plot')
        .style({ width: '100%', height: '100%' })
        .node()
    );
  });
})();
