import { Apiz } from "@apiz/sdk";

async function main(): Promise<void> {
  const client = new Apiz();
  const task = await client.tasks.create({
    model: "wan/v2.6/image-to-video",
    params: {
      prompt: "camera slowly zooms in",
      image_url: "https://cdn-video.51sux.com/samples/portrait.png",
    },
  });
  console.log("submitted:", task.task_id);

  const result = await client.tasks.waitFor(task.task_id, {
    pollInterval: 5_000,
    onProgress: (s) => console.log("  status:", s.status),
  });
  console.log(JSON.stringify(result, null, 2));
}

void main();
