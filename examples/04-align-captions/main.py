"""Forced alignment: audio + known subtitle text → word-level timestamps."""

from apiz import Apiz


def main() -> None:
    client = Apiz()

    result = client.align(
        {
            "audio_url": "https://fal-task-hk.tos-cn-hongkong.volces.com/transfer/audio/2026/04/20/619fa17492bf40079afe2ee5e43aa42b.mp3",
            "audio_text": "如果您没有其他需要举报的话，这边就先挂断了。祝您生活愉快，再见。",
            "mode": "speech",
        }
    )

    print(f"duration: {result.duration}s, {len(result.utterances)} utterances")
    for u in result.utterances:
        print(f"[{u.start_time}-{u.end_time}ms] {u.text}")
        for w in u.words:
            print(f"  {w.start_time}-{w.end_time} {w.text}")


if __name__ == "__main__":
    main()
