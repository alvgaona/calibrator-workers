use serde::{Deserialize, Serialize};
use worker::*;

#[derive(Serialize, Debug, Clone, Deserialize)]
pub struct R2Event {
  account: String,
  action: String,
  bucket: String,
  object: CustomR2Object,
  #[serde(rename = "eventTime")]
  event_time: String,
  #[serde(rename = "copySource")]
  copy_source: Option<CopySource>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CustomR2Object {
  key: String,
  size: u32,
  #[serde(rename = "eTag")]
  etag: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct CopySource {
    bucket: String,
    object: String,
}

#[event(queue)]
async fn main(message_batch: MessageBatch<R2Event>, _env: Env, _context: Context) -> Result<()> {
  for message in message_batch.messages()? {
    console_log!("{:?}", message.body());
    message.ack();
  }

  Ok(())
}
