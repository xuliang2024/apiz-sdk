import { Apiz } from "@apiz/sdk";

async function main(): Promise<void> {
  const client = new Apiz();
  const result = await client.generate({
    model: "jimeng-4.5",
    prompt: "a small grayscale cat sketch, simple",
  });
  // jimeng-4.5 is a sync-channel model: status === "completed" inline.
  console.log(JSON.stringify(result, null, 2));
}

void main();
