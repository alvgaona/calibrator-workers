interface Env {
  CALIBRATOR_INPUT_BUCKET: R2Bucket;
  CALIBRATOR_UPLOAD_BUCKET: R2Bucket;
}

export default {
  async queue(
    batch: MessageBatch,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    for (const message of batch.messages) {
      console.log('Received', message);
    }
  },
};
