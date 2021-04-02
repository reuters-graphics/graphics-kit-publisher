require('dotenv').config();
const GraphicsKitPublisher = require('../dist');
const expect = require('expect.js');

const graphicsKitPublisher = new GraphicsKitPublisher();

describe('test GraphicsKitPublisher', function() {
  this.timeout(10000);

  it('Should greet', function() {
    expect(graphicsKitPublisher.greet('Sue', true)).to.be('Hello, Sue!');
  });
});
