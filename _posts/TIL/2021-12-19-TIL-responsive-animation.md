---
layout: post
title: "[TIL] Window size에 따라 속도가 달라지는 CSS Animation 바로잡기"
categories: TIL
date: 2021-12-19 18:38:16 +0900
math: true
tags:
  - TIL
  - CSS
  - CSS Animation
  - Vue.js
---

## 문제 상황

새벽에 어쩌다 떠오른 아이디어로 짧고 굵게 토이 프로젝트를 진행해보고 있다.

[Github repo](https://github.com/shinkeonkim/can-you-catch-circle)

[Site page](http://www.singun11.wtf/can-you-catch-circle/)

바로 Can you catch "Circle" 이다. 뭐.. 줄이자면 CCC 일 것 같다. ㅋㅋㅋ

<img src="/assets/img/posts/2021-12-19/canyoucatchcircle.jpg" alt="canyoucatchcircle" class="w-50">

굉장히 단순한 웹 페이지 프로젝트이다.

단순히 화면에 있는 "Circle"을 잡으면 된다.

아직은 좌우로 움직이는 기믹밖에 없지만, 점차 추가해보려고 한다.

아무튼, 방금 언급한 "좌우로 움직히는 기믹"을 만들던 중, 아래와 같은 코드에서 한가지 생각지도 못했던 이슈가 발생했다.

```css
.move-left-to-right {
  animation: just-left-to-right 20s linear infinite;
  -webkit-animation-name: just-left-to-right;
  -webkit-animation-duration: 20s;
  -webkit-animation-timing-function:linear;
  -webkit-animation-iteration-count: infinite;
}

@keyframes just-left-to-right {
  0% {
    transform: translateX(-45vw);
  }

  50% {
    transform: translateX(45vw);
  }

  100% {
    transform: translateX(-45vw);
  }
}

@-webkit-keyframes just-left-to-right {
  0% {
    -webkit-transform: translateX(-45vw);
  }

  50% {
    -webkit-transform: translateX(45vw);
  }

  100% {
    -webkit-transform: translateX(-45vw);
  }
}
```

바로 모바일과 PC에서의 화면 크기 차이 때문에 Circle이 다른 속도로 움직인다는 것이다.

왤까? 오랜만에 간단한 물리 식 $$ V(속력) = D(거리) / T(시간) $$ 을 떠올려보자.

여기서 거리는 $$ 90vw * 2 $$ 일 것 이다.(왕복 거리) 그리고 시간은 20초이다.

한가지 의문이 들 수 있다. `어? 수치가 정해져있는데, 속력이 고정되어있는 것 아닌가요?`

**아니다**

vw 는 화면 크기에 따라 달라지는 `가변단위` 이기 때문이다. 

따라서, 자연스럽게 화면 크기가 커지면 속력이 증가하고, 화면 크기가 작아지면 속력이 감소한다.

그래서 모바일에서 보면 굉장히 굉장히 느려지는 이슈가 발생한 것이었다.

## 그럼 어떻게 고쳤나?

여러 가지로 시도해봤지만 SCSS에서 가져온 window width를 시간 개념으로 다시 convert 하는 방법을 찾지 못했다.

그래서 해당 프로젝트는 Vue.js 프로젝트였기 때문에, js 단에서 속도를 정의하고 이걸 template에 주입하는 방식으로 해결했다.

솔직히 마음에 드는 방법은 아닌지라, 조금이라도 더 좋은 방벙을 발견하면 고칠 것 같다.

아래 코드가 해당 문제를 해결한 수정 내용이다. (해당 글과 상관없는 내용과 위에 첨부한 style 부분은 생략했다.)

```vue
<template>
  <Circle
    class="move-left-to-right"
    :style="`animation-duration: ${compuetedAnimationDuration}s;-webkit-animation-duration: ${compuetedAnimationDuration}s;`"
  />
</template>

<script lang="ts">
import {
  computed,
  defineComponent, inject, onMounted, ref,
} from 'vue'
import Circle from '@/components/Circle.vue'

export default defineComponent({
    name: "JustMovingPage",
    setup() {
      const VELOCITY = 150;
      const windowWidth = ref(1);
      const compuetedAnimationDuration = computed(() => windowWidth.value / VELOCITY);

      onMounted(() => {
        windowWidth.value = window.innerWidth;
        window.onresize = () => {
          windowWidth.value = window.innerWidth;
        }
      })

      return {
        windowWidth,
        compuetedAnimationDuration,
      } 
    },
    components: {
      Circle
    }
})
</script>
```

## 참고한 글

[Stackoverflow: Set reactive screen width with vuejs](https://stackoverflow.com/questions/51565331/set-reactive-screen-width-with-vuejs)
