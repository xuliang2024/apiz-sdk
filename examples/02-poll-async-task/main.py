"""Submit an async video task and poll until it finishes."""

from apiz import Apiz


def main() -> None:
    client = Apiz()
    task = client.tasks.create(
        model="wan/v2.6/image-to-video",
        params={
            "prompt": "camera slowly zooms in",
            "image_url": "https://cdn-video.51sux.com/samples/portrait.png",
        },
    )
    print("submitted:", task.task_id)

    result = client.tasks.wait_for(
        task.task_id,
        poll_interval=5,
        on_progress=lambda s: print("  status:", s.status),
    )
    print(result.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
