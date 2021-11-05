import buildPreviewMixin from './build';
import getPreviewURLMixin from './getPreviewURL';
import publishToAWSMixin from './publishToAWS';
export default {
  ...getPreviewURLMixin,
  ...buildPreviewMixin,
  ...publishToAWSMixin,
  async preview() {
    this.getPreviewURL();
    this.buildPreview();
    this.validateBuiltFiles();
    await this.publishToAWS();
  },
};
