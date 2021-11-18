---
layout: post
title: "[TIL] 슬랙 웹훅과 깃헙 액션을 이용해 알림 봇 만들기"
categories: TIL
date: 2021-11-18 20:02:09 +0900
math: true
tags:
  - TIL
  - 슬랙 webhook
  - Github action
---

## 계기

국민대학교 멋쟁이사자처럼에서 슬랙을 사용하기로 했고, 내부 스터디인 줌터디도 슬랙에서 활동을 하게되었다.
이때, 특정 시간마다 회고글을 쓰라는 메세지가 주기적으로 오는 봇이 있으면 좋겠다고 생각이 들었다.

그래서 바로 워크플로빌더를 켰지만... 무료 플랜에서는 사용할 수 없었다...

![wtf](/assets/img/posts/2021-11-18/TIL-slack-web-hook-and-github-action/wtf.png)

그래서 직접 만들자! 결심했다.

일단 먼저 슬랙에 메세지를 보내기 위해, Slack Incoming Webhook을 설정했다.

큰 이슈는 없고, 딱 Webhook URL만 알아내면 된다. (간단해서.. 스킵..)

그리고 이제 주기적으로 메세지를 보내는 환경을 만들어야 한다.

cron job을 실행할 서버가 따로 있을까 고심하던 중, Github Action을 떠올렸고 구글링을 해서 간단한 파이썬 프로젝트를 구성했다.

`.github/workflow/python-apps.yml`
```yml
name: Noti Zoom Study

on:
  schedule:
    - cron: "0 11 ? * SUN"
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v2
    - name: Set up Python 3.10
      uses: actions/setup-python@v2
      with:
        python-version: "3.10"
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
    - name: Noti
      run: python actions/zoom_study_notice.py
      env:
        ZOOM_STUDY_WEBHOOK_URL: ${{ secrets.ZOOM_STUDY_WEBHOOK_URL }}
```

`actions/zoom_study_notice.py`
```python
import os, sys

sys.path.append(os.path.dirname(os.path.abspath(os.path.dirname(__file__))))

from dotenv import load_dotenv
from api.slack import post_text

load_dotenv(verbose=True)

ZOOM_STUDY_WEBHOOK_URL = os.environ.get("ZOOM_STUDY_WEBHOOK_URL")

ZOOM_STUDY_NOTICE = """<!channel> 이번주가 지났습니다.
1. 한 주동안 달성하고자 하는 목표를 적어주세요.
2. 지난 일주일동안의 목표 달성률과 그 이유를 적어주세요
[예시]
😀 이번주 목표
  - 도메인 주도 설계 책 4챕터까지 읽기
🤗 지난주 달성
  - 75/100, 3챕터까지 다 읽고자했지만, 못 읽었다.
😉 목표의 방향은 정해져있지않아요.
🙃 스스로 할 수 있는 목표치를 정해보아요.
😇 매주 목표를 정하고, 점검해보아요
🥰 목표가 많다면 여러개를 적어도 돼요
"""


if __name__ == "__main__":
    ret = post_text(ZOOM_STUDY_WEBHOOK_URL, ZOOM_STUDY_NOTICE)
    print(ret)
```

> [참고한 블로그](https://deepbaksu.github.io/2020/09/18/slack-github-action-automation/)

> [Github Repository](https://github.com/shinkeonkim/kmu-likelion-slack-noti-action)

> 이번에 cron을 쉽게 만들려고 알아보던 중에, [cronmaker](http://www.cronmaker.com/)라는 사이트를 처음 알게 되었다. cron 정규 표현식을 더 쉽게 만들어준다.

메세지가 잘 온다!
![result](/assets/img/posts/2021-11-18/TIL-slack-web-hook-and-github-action/result.png)