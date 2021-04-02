class GraphicsKitPublisher {
  greet(name, happy = false) {
    return `Hello, ${name}${happy ? '!' : '.'}`;
  }
}

export default GraphicsKitPublisher;
