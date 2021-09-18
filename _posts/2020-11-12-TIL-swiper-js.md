---
layout: post
title: "[TIL] swiper.js 사용하기"
categories: TIL
tags: ['슬라이드쇼', 'swiper.js']
---

[shinkeonkim.github.io/css-animation-study/](https://shinkeonkim.github.io/css-animation-study/)

[css animation study](https://shinkeonkim.github.io/css-animation-study/)

이 페이지를 꾸미고 싶었다.

뭔가 지금까지 공부하고 있는 내용들을 슬라이드쇼로 보여주고 싶었고,

직접 구현하면 재밌겠지만 굳이? 내가 해야하나 싶어서 예전에 썼던 slick.js를 쓸까 하다가

뭔가 마음에 안들었던 부분들이 있었어서 새로운 걸 써보자 하고 다른 걸 찾아봤다.

그래서 나온 것이 swiper.js 이다.

[swiperjs.com/demos/](https://swiperjs.com/demos/)

[Swiper Demos swiperjs.com](https://swiperjs.com/demos/)

일단, 굳이 코드를 다운받고 코드를 실행시키고 싶지않다! CDN을 쓰겠다 하면 아래와 같이 css와 script를 가져오면 되고, 

```
<link rel="stylesheet" href="https://unpkg.com/swiper/swiper-bundle.min.css">
<script src="https://unpkg.com/swiper/swiper-bundle.min.js"></script>
```

아래와 같이 swiper를 초기화 하면된다.

```
<div class="swiper-container">
  <div class="swiper-wrapper">
    <div class="swiper-slide">Slide 1</div>
    <div class="swiper-slide">Slide 2</div>
    <div class="swiper-slide">Slide 3</div>
    <div class="swiper-slide">Slide 4</div>
    <div class="swiper-slide">Slide 5</div>
    <div class="swiper-slide">Slide 6</div>
    <div class="swiper-slide">Slide 7</div>
    <div class="swiper-slide">Slide 8</div>
    <div class="swiper-slide">Slide 9</div>
    <div class="swiper-slide">Slide 10</div>
  </div>
</div>

<script>
  var swiper = new Swiper('.swiper-container');
</script>
```

또한, 추가적인 설정을 하는 방법이나 기타 자세한 내용은 그냥 Demo에 들어가서 코드들을 보면 바로 확인할 수 있으니 굳이 남기지 않겠다. 그냥 Demo를 보면서 원하는 효과를 막막 섞어서 넣자. 그러면 어떻게든 만들어진다.

만약, Auto Play를 원한다? 그러면 아래 부분을 보면 되는 것처럼..

[swiperjs.com/demos/#autoplay](https://swiperjs.com/demos/#autoplay)

[Swiper Demos swiperjs.com](https://swiperjs.com/demos/#autoplay)