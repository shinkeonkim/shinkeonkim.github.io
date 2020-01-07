from graphviz import *

dot = Digraph(comment='The Round Table', format='svg')

dot.attr(rankdir = "LR")

Node = [('var','변수'),('input','입력(cin)'),('output', '출력문(cout)'),('operator','연산자(+,-,*,/ 등등)'),
    ('escape','이스케이프 문자란'),('loop','반복문이란'),('for','for문이란'),('for_1d','for문(1차원))'),
    ('for_2d','for문(2차원)'),('while','while문이란'),('while_1d','while문(1차원)'),('while_2d','while문(2차원)'),
    ('if_1','조건문이란'),('if_2','조건문 if'),('array','배열이란'),('array_1d','1차원 배열'),('array_2d','2차원 배열'),
    ('loop_2','반복문 제어'),('break','break문'),('continue','continue문'),('sort','정렬이란'),('bubble_sort','버블 정렬'),
    ('data_structure','자료 구조란'),('linear','선형 자료구조'),('Nonlinear','비선형 자료구조'),('tree','트리란'),
    ('graph','그래프란'),('binary_tree','이진 트리'),('segment_tree','세그먼트 트리'),('Mo\'s Algorithm','평방 분할 알고리즘'),
    ('function','함수란'),('recursion','재귀함수'),('fibonacci','재귀함수를 이용한\n피보나치 수열'),
    ('hanoi','재귀함수를\n이용한 하노이탑'),('gcd','재귀함수를 이용해\n최대 공약수 구하기'),('data_type','자료형'),
    ('quick_sort','퀵 정렬'),('std::sort','std::sort 활용'),('structure','구조체란'),('structure_sort','구조체 정렬'),


    ]

for i in Node:
    dot.node(i[0],i[1])

dot.edge('output','var')
dot.edge('var' , 'input')
dot.edge('var', 'operator')
dot.edge('var','data_type')
dot.edge('output', 'escape')
dot.edge('loop','for')
dot.edge('for','for_1d')
dot.edge('for_1d','for_2d')
dot.edge('loop','while')
dot.edge('while','while_1d')
dot.edge('while_1d','while_2d')
dot.edge('input','if_1')
dot.edge('output','if_1')
dot.edge('if_1','if_2')
dot.edge('array','array_1d')
dot.edge('array_1d','array_2d')
dot.edge('loop','array')
dot.edge('for','loop_2')
dot.edge('while','loop_2')
dot.edge('loop_2','break')
dot.edge('loop_2','continue')
dot.edge('if_2','loop')

# 정렬
dot.edge('sort','bubble_sort')

# 자료구조
dot.edge('data_structure','linear')
dot.edge('data_structure','Nonlinear')
dot.edge('Nonlinear','tree')
dot.edge('Nonlinear','graph')
dot.edge('tree','binary_tree')
dot.edge('tree','segment_tree')
dot.edge('tree','Mo\'s Algorithm')



# 함수
dot.edge('loop','function')
dot.edge('function','recursion')
dot.edge('recursion','fibonacci')
dot.edge('recursion','hanoi')
dot.edge('recursion','gcd')


dot.render('gv/curriculum.gv', view=True)
