function hyperfocal(focal, aperture, coc) {
  return focal + Math.pow(focal, 2) / (aperture * coc);
}

function limits(focal, subject, hyperfocal) {
  let hs = hyperfocal * subject;
  let sf = subject - focal;
  return [
    hs / (hyperfocal + sf),
    hs / (hyperfocal - sf)
  ];
}

function circleOfConfusion(crop) {
  const ffDiag = 43.2;
  const divisor = 1500;
  return ffDiag / (crop * divisor);
}

const sensorSizes = [
  {symbol: 'full frame', crop: 1},
  {symbol: 'APS-C', crop: 1.53},
  {symbol: 'Four Thirds', crop: 2},
  {symbol: '1 inch', crop: 2.72},
  {symbol: '1/2.3 inch', crop: 5.64},
  {symbol: '1/3 inch', crop: 7.21},
];

const fStops = [
  1, 1.1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.5, 2.8, 3.2, 3.5, 4, 4.5,
  5, 5.6, 6.3, 7.1, 8, 9, 10, 11, 13, 14, 16, 18, 20, 22, 25, 29, 32
];

const app = new Vue({
  el: '#app',
  data: {
    sensorSizes: sensorSizes,
    fStops: fStops,
    // defaults
    crop: 1,
    yPlot: 'nf',
    xPlot: 'a',
    fStop: 6,
    focalEquiv: 50,
    subject: 200,
  },
  computed: {
    focal: function() {
      return Math.round(this.focalEquiv / this.crop);
    },
    aperture: function() {
      return fStops[this.fStop];
    },
  }
});
