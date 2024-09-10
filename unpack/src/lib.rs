use serde::{Deserialize, Serialize};
use worker::*;
use flate2::read::GzDecoder;
use tar::Archive;
use std::io::Read;

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
async fn main(message_batch: MessageBatch<R2Event>, env: Env, _context: Context) -> Result<()> {
  for message in message_batch.messages()? {
    let event = message.body();
    console_log!("{:?}", event);

    let src_bucket = env.bucket("CALIBRATOR_UPLOAD_BUCKET")?;
    let object = src_bucket.get(&event.object.key).execute().await?;

    // Unwrap the Option<Object> first
    if let Some(object) = object {
        // Now we can call body() on the actual Object
        if let Some(object_contents) = object.body() {
            // Rest of your code remains the same
            let buffer = object_contents.bytes().await?;

            // Decompress the gzip content
            let mut gz = GzDecoder::new(&buffer[..]);
            let mut decompressed = Vec::new();
            gz.read_to_end(&mut decompressed)?;

            // Unpack the tar archive
            let mut archive = Archive::new(&decompressed[..]);
            for entry in archive.entries()? {
                let entry = entry?;
                let path = entry.path()?;
                console_log!("Unpacked file: {:?}", path);
            }
        } else {
            console_log!("Object body not found");
        }
    } else {
        console_log!("Object not found");
    }

    message.ack();
  }

  Ok(())
}
