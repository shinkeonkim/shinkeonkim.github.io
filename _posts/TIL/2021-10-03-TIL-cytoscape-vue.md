---
layout: post
title: "[TIL] vue에서 cytoscape 사용하기 1"
categories: TIL
date: 2021-10-03 01:19:23 +0900
math: true
tags:
  - Vue.js
  - cytoscape
---

## 계기

개인 프로젝트로 connection 이라는 이름의 프로젝트를 진행중이다.

해당 프로젝트에서는 특정 아이템들을 그래프화시켜서 보여주어야 하는데, 무슨 라이브러리를 쓸지 고민하다가 [cytoscape](https://github.com/cytoscape/cytoscape.js) 를 쓰기로 했다.

cytoscape를 쓰기로 결심을 하게 된 가장 큰 이유는 아래 demo였다.

[demo 보러가기](https://ivis-at-bilkent.github.io/cytoscape.js-fcose/demo/demo-compound.html)

문제는 connection 프로젝트에서 Vue.js를 쓰기로 마음먹었는데, 여기서 어떻게 이걸 쓰냐였다.

vue component로 wrapping 해놓은 [vue-cytoscape](https://github.com/rcarcasses/vue-cytoscape)가 있는 것 같긴 했지만..

star 수나, issue 수를 보고 사용하고 싶은 마음이 별로 없어졌다.

그냥 직접 가져와서 뻘짓 해보기로 결정했다.

## 그럼 어떻게 하지?

일단 설치

```bash
> yarn add cytoscape
```

그리고 직접 import 해서 여러 뻘짓을 했는데, 계속 element가 잘 안보였다.
원인을 찾다가 [관련 스택오버플로우 답변](https://stackoverflow.com/questions/62566115/how-can-cytoscape-be-used-as-part-of-a-vue-component)을 찾았다.

일단 그대로 적용했다.

```javascript
<template>
  <div id="cy-wrapper">
    <div id="cy" ref="cyElement"></div>
  </div>
</template>
<script lang="ts">
import { defineComponent, nextTick, onMounted, ref } from 'vue'
import cytoscape from 'cytoscape';

export default defineComponent({
  name: 'CytoscapeTest',
  setup() {
    const cyElement = ref(null);
    const cyInstance = ref(null);

    const resizeGraph = () => {
      if (cyInstance.value) {
        cyInstance.value.resize();
      }
    }

    const test = async () => {
      await nextTick()
      resizeGraph();
    }

    onMounted(() => {
      import('cytoscape')
        .then((cy) => {
          const cytoscape = cy.default;
        })
        .then(() => {
          const element = document.createElement('div');
          element.setAttribute('id', 'cy-mounting-point');
            
          cyElement.value.appendChild(element);

          cyInstance.value = Object.freeze(
            cytoscape({
              container: element,
              elements: [ // list of graph elements to start with
                { // node a
                  data: { id: 'a' }
                },
                { // node b
                  data: { id: 'b' }
                },
                { // edge ab
                  data: { id: 'ab', source: 'a', target: 'b' }
                }
              ],

              style: [ // the stylesheet for the graph
                {
                  selector: 'node',
                  style: {
                    'background-color': '#666',
                    'label': 'data(id)'
                  }
                },

                {
                  selector: 'edge',
                  style: {
                    'width': 3,
                    'line-color': '#ccc',
                    'target-arrow-color': '#ccc',
                    'target-arrow-shape': 'triangle',
                    'curve-style': 'bezier'
                  }
                }
              ],
              layout: {
                name: 'grid',
                rows: 1
              }
            })
          );

          test();
        })
    });

    return {
      cyElement,
    }
  },
})
</script>
```

하지만 여전히 보이지 않았다.

근데, 아래 이미지와 같이 canvas element는 있는데 보이지 않았고, `어? width, height 문제인가?` 라는 생각이 들었다.

![canvas가 있어](/assets/img/posts/cytoscape-vue-canvas.png)

그래서 아래 코드와 같이 임시로 스타일을 추가해주었더니, 아주 잘 보였다..
(왠지 나의 뻘짓 코드도 동일한 문제였던 것 같고, stackoverflow의 코드처럼 복잡한 코드가 되지 않아도 되지 않았을까 라는 생각이 들었다.. 일단 다음에 고치기로 했다..)

![결과](/assets/img/posts/cytoscape-vue-canvas-2.png)

```scss
<style lang="scss">

#cy {
  width: 100%;
  min-height: 1000px;

  div {
    width: 100%;
    min-height: 1000px;  
  }

  div#cy-mounting-point {
    canvas {
      padding-left: 0;
      padding-right: 0;
      margin-left: auto;
      margin-right: auto;
      display: block;
    }
  }
}

</style>
```

일단 그래프 형태로 찍어냈다는 것에 만족하고... 원하는 형태의 그래프로 조금씩 바꾸어 나가면 될 것 같다.

끝
