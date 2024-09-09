interface Env {
  CALIBRATOR_INPUT_BUCKET: R2Bucket;
  CALIBRATOR_UPLOAD_BUCKET: R2Bucket;
}

interface R2Event {
  account: string;
  action: string;
  bucket: string;
  object: R2Object;
  eventTime: string;
  copySource: {
    bucket: string;
    object: string;
  };
}

export default {
  async queue(
    batch: MessageBatch,
    env: Env,
    ctx: ExecutionContext,
  ): Promise<void> {
    for (const message of batch.messages) {
      const event: R2Event = JSON.parse(message.body as string);

      if (
        event.action === 'PutObject' &&
        event.object.key.endsWith('.tar.gz')
      ) {
        console.log(`The uploaded object was ${event.object.key}`);
        message.ack();
      } else {
        console.warn(`Event action ${event.action} will not be handled`);
      }
    }
  },
};
