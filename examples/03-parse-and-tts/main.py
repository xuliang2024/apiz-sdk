"""Parse a public video URL and synthesize a short voice-over."""

from apiz import Apiz


def main() -> None:
    client = Apiz()
    parsed = client.tools.parse_video("https://v.douyin.com/iJqPAfre/")
    print("video_url:", parsed.video_url)

    voice = client.speak("hello, this is apiz", model="speech-2.8-turbo")
    print("audio_url:", voice.audio_url)


if __name__ == "__main__":
    main()
