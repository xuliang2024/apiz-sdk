"""Generate a single image with apiz (Python sync client)."""

from apiz import Apiz


def main() -> None:
    client = Apiz()  # reads APIZ_API_KEY from env
    result = client.generate(
        model="jimeng-4.5",
        prompt="a small grayscale cat sketch, simple",
    )
    print(result.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
