import json
import os

def write_json(path, data):
    with open(path, 'w') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"Generated {path}")

# 1. OSI 7 Layer
def get_osi_color(layer):
    colors = {
        7: ("#fef3c7", "#f59e0b"),
        6: ("#fde68a", "#d97706"),
        5: ("#fdba74", "#ea580c"),
        4: ("#fb923c", "#c2410c"),
        3: ("#f87171", "#dc2626"),
        2: ("#a78bfa", "#7c3aed"),
        1: ("#818cf8", "#4f46e5"),
    }
    return colors.get(layer, ("#e0e7ff", "#6366f1"))

osi_elements = []
osi_elements.append({
    "type": "text", "id": "step-label", "x": 400, "y": 20,
    "content": "OSI 7 Layer 캡슐화", "fontSize": 18, "fontWeight": 700, "textAnchor": "middle"
})
osi_elements.append({
    "type": "line", "id": "link", "fromId": "s1", "toId": "r1", "stroke": "#4f46e5", "strokeWidth": 4, "strokeDasharray": "5,5"
})

layers = ["Physical", "Data Link", "Network", "Transport", "Session", "Presentation", "Application"]
for i in range(1, 8):
    layer_name = layers[i-1]
    fill, stroke = get_osi_color(i)
    # Sender (L7=50, L6=100, ..., L1=350)
    y = 50 + (7 - i) * 50
    osi_elements.append({
        "type": "rect", "id": f"s{i}", "x": 50, "y": y, "width": 160, "height": 40,
        "fill": fill, "stroke": stroke, "cornerRadius": 4,
        "label": f"{i}. {layer_name}", "labelColor": "#111827", "labelSize": 14
    })
    # Receiver
    osi_elements.append({
        "type": "rect", "id": f"r{i}", "x": 590, "y": y, "width": 160, "height": 40,
        "fill": fill, "stroke": stroke, "cornerRadius": 4,
        "label": f"{i}. {layer_name}", "labelColor": "#111827", "labelSize": 14
    })

# Packet
osi_elements.append({
    "type": "rect", "id": "packet", "x": 230, "y": 60, "width": 60, "height": 20,
    "fill": "#e0e7ff", "stroke": "#6366f1", "cornerRadius": 2,
    "label": "DATA", "labelSize": 10
})

osi_steps = [
    {
        "id": "step1", "label": "L4 캡슐화", "duration": 800, "ease": "easeOut",
        "keyframes": {
            "packet": { "y": 210, "width": 100, "label": "[TCP] DATA", "fill": "#fb923c" },
            "step-label": { "content": "Transport Layer: TCP 헤더 추가 (Segment)" }
        },
        "effects": [{"type": "highlight", "elementId": "s4"}]
    },
    {
        "id": "step2", "label": "L3 캡슐화", "duration": 800, "ease": "easeOut",
        "keyframes": {
            "packet": { "y": 260, "width": 140, "label": "[IP][TCP] DATA", "fill": "#f87171" },
            "step-label": { "content": "Network Layer: IP 헤더 추가 (Packet)" }
        },
        "effects": [{"type": "highlight", "elementId": "s3"}]
    },
    {
        "id": "step3", "label": "L2 캡슐화", "duration": 800, "ease": "easeOut",
        "keyframes": {
            "packet": { "y": 310, "width": 180, "label": "[MAC][IP].. DATA", "fill": "#a78bfa" },
            "step-label": { "content": "Data Link Layer: MAC 헤더 추가 (Frame)" }
        },
        "effects": [{"type": "highlight", "elementId": "s2"}]
    },
    {
        "id": "step4", "label": "L1 전송", "duration": 1000, "ease": "easeInOut",
        "keyframes": {
            "packet": { "x": 390, "y": 360, "label": "010101010...", "fill": "#818cf8" },
            "step-label": { "content": "Physical Layer: 비트 스트림으로 전송" }
        },
        "effects": [{"type": "flow", "elementId": "link"}]
    },
    {
        "id": "step5", "label": "L3 디캡슐화", "duration": 800, "ease": "easeOut",
        "keyframes": {
            "packet": { "x": 430, "y": 260, "width": 140, "label": "[IP][TCP] DATA", "fill": "#f87171" },
            "step-label": { "content": "수신측 L3: MAC 헤더 제거 및 IP 확인" }
        },
        "effects": [{"type": "highlight", "elementId": "r3"}]
    },
    {
        "id": "step6", "label": "L4 디캡슐화", "duration": 800, "ease": "easeOut",
        "keyframes": {
            "packet": { "y": 210, "width": 100, "label": "[TCP] DATA", "fill": "#fb923c" },
            "step-label": { "content": "수신측 L4: IP 헤더 제거 및 TCP 확인" }
        },
        "effects": [{"type": "highlight", "elementId": "r4"}]
    },
    {
        "id": "step7", "label": "L7 도달", "duration": 800, "ease": "easeOut",
        "keyframes": {
            "packet": { "y": 60, "width": 60, "label": "DATA", "fill": "#fef3c7" },
            "step-label": { "content": "Application Layer: 최종 데이터 수신" }
        },
        "effects": [{"type": "highlight", "elementId": "r7"}]
    },
    {
        "id": "step8", "label": "초기화", "duration": 600, "ease": "linear",
        "keyframes": {
            "packet": { "x": 230, "y": 60, "width": 60, "label": "DATA", "fill": "#e0e7ff" },
            "step-label": { "content": "OSI 7 Layer 캡슐화" }
        },
        "effects": []
    }
]

osi_json = {
    "version": 2,
    "id": "osi-7-layer",
    "title": "OSI 7 Layer Encapsulation",
    "description": "데이터가 송신 측에서 캡슐화되고 수신 측에서 디캡슐화되는 과정",
    "category": "protocol",
    "tags": ["osi", "network", "layer", "encapsulation"],
    "canvas": { "width": 800, "height": 500, "background": "transparent" },
    "elements": osi_elements,
    "initiallyHidden": [],
    "steps": osi_steps,
    "settings": { "loop": True, "autoplay": True, "stepGapMs": 200 }
}
write_json("/Users/koa/100-github-io/public/animations/osi-7-layer.json", osi_json)


# 2. Browser Google Search
bgs_elements = [
    { "type": "text", "id": "step-label", "x": 400, "y": 30, "content": "사용자가 브라우저에 google.com 을 입력합니다.", "fontSize": 18, "fontWeight": 700, "textAnchor": "middle" },
    { "type": "rect", "id": "browser", "x": 50, "y": 200, "width": 140, "height": 100, "label": "Browser", "fill": "#f1f5f9" },
    { "type": "text", "id": "url-bar", "x": 120, "y": 230, "content": "...", "fontSize": 14, "textAnchor": "middle" },
    
    { "type": "rect", "id": "dns-server", "x": 330, "y": 80, "width": 140, "height": 80, "label": "DNS Server", "fill": "#e0e7ff" },
    { "type": "rect", "id": "google-server", "x": 600, "y": 200, "width": 140, "height": 100, "label": "Google Server", "fill": "#dcfce3" },
    
    { "type": "line", "id": "l-dns", "fromId": "browser", "toId": "dns-server", "stroke": "#cbd5e1" },
    { "type": "line", "id": "l-server", "fromId": "browser", "toId": "google-server", "stroke": "#cbd5e1" },
    
    { "type": "circle", "id": "packet", "cx": 120, "cy": 250, "r": 15, "label": "", "fill": "#fbbf24" }
]

bgs_steps = [
    {
        "id": "s1", "label": "URL 입력", "duration": 800, "ease": "easeOut",
        "keyframes": {
            "url-bar": { "content": "google.com" },
            "step-label": { "content": "1. 브라우저 주소창에 google.com 입력" }
        }
    },
    {
        "id": "s2", "label": "DNS 쿼리", "duration": 800, "ease": "easeInOut",
        "keyframes": {
            "packet": { "cx": 400, "cy": 120, "label": "DNS?" },
            "step-label": { "content": "2. DNS 서버에 google.com 의 IP 주소 쿼리" }
        }
    },
    {
        "id": "s3", "label": "IP 반환", "duration": 800, "ease": "easeInOut",
        "keyframes": {
            "packet": { "cx": 120, "cy": 250, "label": "IP", "fill": "#34d399" },
            "url-bar": { "content": "142.250.x.x" },
            "step-label": { "content": "3. DNS 서버가 IP 주소 반환" }
        }
    },
    {
        "id": "s4", "label": "TCP Handshake", "duration": 1000, "ease": "easeInOut",
        "keyframes": {
            "packet": { "cx": 670, "cy": 250, "label": "SYN", "fill": "#fbbf24" },
            "step-label": { "content": "4. 서버와 TCP Handshake (SYN -> SYN/ACK -> ACK)" }
        }
    },
    {
        "id": "s5", "label": "TLS Handshake", "duration": 1000, "ease": "easeInOut",
        "keyframes": {
            "packet": { "cx": 120, "cy": 250, "label": "Cert", "fill": "#a78bfa" },
            "step-label": { "content": "5. HTTPS 보안 연결을 위한 TLS Handshake" }
        }
    },
    {
        "id": "s6", "label": "HTTP GET", "duration": 800, "ease": "easeInOut",
        "keyframes": {
            "packet": { "cx": 670, "cy": 250, "label": "GET", "fill": "#60a5fa" },
            "step-label": { "content": "6. 암호화된 HTTP GET 요청 전송" }
        }
    },
    {
        "id": "s7", "label": "HTTP 응답", "duration": 800, "ease": "easeInOut",
        "keyframes": {
            "packet": { "cx": 120, "cy": 250, "label": "HTML", "fill": "#34d399" },
            "step-label": { "content": "7. 서버가 HTML 문서 응답" }
        }
    },
    {
        "id": "s8", "label": "렌더링", "duration": 800, "ease": "easeOut",
        "keyframes": {
            "browser": { "fill": "#fef08a" },
            "url-bar": { "content": "Google Search" },
            "packet": { "cx": 120, "cy": 250, "label": "", "fill": "transparent", "stroke": "transparent" },
            "step-label": { "content": "8. 브라우저가 화면 렌더링 완료!" }
        }
    },
    {
        "id": "s9", "label": "리셋", "duration": 600, "ease": "linear",
        "keyframes": {
            "browser": { "fill": "#f1f5f9" },
            "url-bar": { "content": "..." },
            "packet": { "cx": 120, "cy": 250, "label": "", "fill": "#fbbf24", "stroke": "#d97706" },
            "step-label": { "content": "사용자가 브라우저에 google.com 을 입력합니다." }
        }
    }
]

bgs_json = {
    "version": 2,
    "id": "browser-google-search",
    "title": "Google 검색의 네트워크 과정",
    "description": "브라우저에서 서버까지의 통신 단계 시각화",
    "category": "network",
    "tags": ["dns", "tcp", "tls", "http", "browser"],
    "canvas": { "width": 800, "height": 500, "background": "transparent" },
    "elements": bgs_elements,
    "initiallyHidden": [],
    "steps": bgs_steps,
    "settings": { "loop": True, "autoplay": True, "stepGapMs": 200 }
}
write_json("/Users/koa/100-github-io/public/animations/browser-google-search.json", bgs_json)


# 3. Browser Anatomy
ba_elements = [
    { "type": "text", "id": "step-label", "x": 400, "y": 40, "content": "브라우저의 주요 구성 요소", "fontSize": 20, "fontWeight": 700, "textAnchor": "middle" },
    
    # Base Window
    { "type": "rect", "id": "window", "x": 50, "y": 80, "width": 500, "height": 360, "fill": "#f8fafc", "stroke": "#94a3b8", "cornerRadius": 8 },
    
    # Title Bar / Tab Bar
    { "type": "rect", "id": "title-bar", "x": 50, "y": 80, "width": 500, "height": 40, "fill": "#e2e8f0", "stroke": "#cbd5e1", "cornerRadius": 0 },
    { "type": "rect", "id": "tab1", "x": 60, "y": 90, "width": 120, "height": 30, "fill": "#ffffff", "label": "Tab 1", "cornerRadius": 4 },
    { "type": "rect", "id": "tab2", "x": 190, "y": 90, "width": 120, "height": 30, "fill": "#f1f5f9", "label": "Tab 2", "cornerRadius": 4 },
    
    # Navigation Bar
    { "type": "rect", "id": "nav-bar", "x": 50, "y": 120, "width": 500, "height": 40, "fill": "#ffffff", "stroke": "#cbd5e1", "cornerRadius": 0 },
    { "type": "rect", "id": "url-input", "x": 120, "y": 125, "width": 300, "height": 30, "fill": "#f1f5f9", "label": "https://...", "cornerRadius": 15 },
    
    # Bookmark Bar
    { "type": "rect", "id": "bookmark-bar", "x": 50, "y": 160, "width": 500, "height": 30, "fill": "#f8fafc", "stroke": "#e2e8f0", "cornerRadius": 0 },
    { "type": "text", "id": "bm-text", "x": 60, "y": 178, "content": "★ Github   ★ YouTube", "fontSize": 12 },
    
    # Viewport
    { "type": "rect", "id": "viewport", "x": 50, "y": 190, "width": 500, "height": 180, "fill": "#ffffff", "stroke": "#e2e8f0", "label": "Web Content Area (DOM)", "cornerRadius": 0 },
    
    # Dev Tools
    { "type": "rect", "id": "devtools", "x": 50, "y": 370, "width": 500, "height": 50, "fill": "#1e293b", "stroke": "#0f172a", "label": "DevTools", "labelColor": "#fff", "cornerRadius": 0 },
    
    # Status Bar
    { "type": "rect", "id": "status-bar", "x": 50, "y": 420, "width": 500, "height": 20, "fill": "#e2e8f0", "stroke": "#cbd5e1", "cornerRadius": 0 },
    { "type": "text", "id": "sb-text", "x": 60, "y": 434, "content": "Waiting for google.com...", "fontSize": 10 },
    
    # Side Description
    { "type": "rect", "id": "desc-box", "x": 570, "y": 80, "width": 200, "height": 360, "fill": "#e0e7ff", "stroke": "#818cf8", "cornerRadius": 8 },
    { "type": "text", "id": "desc-text", "x": 580, "y": 110, "content": "왼쪽 브라우저 창의\n영역을 확인하세요.", "fontSize": 14 }
]

ba_steps = [
    {
        "id": "s1", "label": "Tab Bar", "duration": 800,
        "keyframes": {
            "title-bar": { "fill": "#fde047" },
            "desc-text": { "content": "Tab Bar / Title Bar\n\n여러 탭을 관리하고\n창 컨트롤을 포함합니다." }
        }, "effects": []
    },
    {
        "id": "s2", "label": "Nav Bar", "duration": 800,
        "keyframes": {
            "title-bar": { "fill": "#e2e8f0" },
            "nav-bar": { "fill": "#fde047" },
            "desc-text": { "content": "Navigation Bar\n\nURL 주소창,\n앞으로/뒤로 가기,\n새로고침 버튼 위치." }
        }, "effects": []
    },
    {
        "id": "s3", "label": "Bookmark Bar", "duration": 800,
        "keyframes": {
            "nav-bar": { "fill": "#ffffff" },
            "bookmark-bar": { "fill": "#fde047" },
            "desc-text": { "content": "Bookmark Bar\n\n자주 방문하는 페이지\n즐겨찾기 목록." }
        }, "effects": []
    },
    {
        "id": "s4", "label": "Viewport", "duration": 800,
        "keyframes": {
            "bookmark-bar": { "fill": "#f8fafc" },
            "viewport": { "fill": "#fde047" },
            "desc-text": { "content": "Viewport\n\n렌더링 엔진이\nHTML/CSS를 그려내는\n실제 웹 컨텐츠 영역." }
        }, "effects": []
    },
    {
        "id": "s5", "label": "DevTools", "duration": 800,
        "keyframes": {
            "viewport": { "fill": "#ffffff" },
            "devtools": { "fill": "#fb923c" },
            "desc-text": { "content": "Developer Tools\n\n네트워크, 콘솔,\nDOM 디버깅을 위한\n개발자 도구." }
        }, "effects": []
    },
    {
        "id": "s6", "label": "Status Bar", "duration": 800,
        "keyframes": {
            "devtools": { "fill": "#1e293b" },
            "status-bar": { "fill": "#fde047" },
            "desc-text": { "content": "Status Bar\n\n링크 hover 시 URL이나\n페이지 로드 상태 표시." }
        }, "effects": []
    },
    {
        "id": "s7", "label": "Reset", "duration": 600,
        "keyframes": {
            "status-bar": { "fill": "#e2e8f0" },
            "desc-text": { "content": "왼쪽 브라우저 창의\n영역을 확인하세요." }
        }, "effects": []
    }
]

ba_json = {
    "version": 2,
    "id": "browser-anatomy",
    "title": "Browser Anatomy",
    "description": "웹 브라우저의 기본 UI 구조",
    "category": "architecture",
    "tags": ["browser", "ui", "architecture"],
    "canvas": { "width": 800, "height": 500, "background": "transparent" },
    "elements": ba_elements,
    "initiallyHidden": [],
    "steps": ba_steps,
    "settings": { "loop": True, "autoplay": True, "stepGapMs": 200 }
}
write_json("/Users/koa/100-github-io/public/animations/browser-anatomy.json", ba_json)


# 4. Hash Collision (Chaining)
hc_elements = [
    { "type": "text", "id": "step-label", "x": 400, "y": 30, "content": "해시 테이블 충돌과 체이닝(Chaining)", "fontSize": 18, "fontWeight": 700, "textAnchor": "middle" },
    { "type": "rect", "id": "hash-func", "x": 50, "y": 80, "width": 200, "height": 60, "fill": "#e0e7ff", "stroke": "#4f46e5", "label": "hash(key) % 5" }
]

# Buckets 0~4
for i in range(5):
    hc_elements.append({
        "type": "rect", "id": f"b{i}", "x": 350, "y": 80 + i*70, "width": 60, "height": 60,
        "fill": "#f1f5f9", "stroke": "#94a3b8", "label": str(i), "labelSize": 18
    })

# Nodes & Links to add dynamically
hc_elements.extend([
    { "type": "rect", "id": "n-apple", "x": 450, "y": 220, "width": 80, "height": 40, "fill": "#dcfce3", "label": "apple", "opacity": 0 },
    { "type": "line", "id": "l-apple", "fromId": "b2", "toId": "n-apple", "opacity": 0 },
    
    { "type": "rect", "id": "n-banana", "x": 450, "y": 360, "width": 80, "height": 40, "fill": "#fef08a", "label": "banana", "opacity": 0 },
    { "type": "line", "id": "l-banana", "fromId": "b4", "toId": "n-banana", "opacity": 0 },
    
    { "type": "rect", "id": "n-cherry", "x": 560, "y": 220, "width": 80, "height": 40, "fill": "#fecaca", "label": "cherry", "opacity": 0 },
    { "type": "line", "id": "l-cherry", "fromId": "n-apple", "toId": "n-cherry", "opacity": 0 },
    
    { "type": "rect", "id": "n-date", "x": 450, "y": 80, "width": 80, "height": 40, "fill": "#e9d5ff", "label": "date", "opacity": 0 },
    { "type": "line", "id": "l-date", "fromId": "b0", "toId": "n-date", "opacity": 0 },
    
    { "type": "rect", "id": "n-elder", "x": 670, "y": 220, "width": 80, "height": 40, "fill": "#fed7aa", "label": "elder", "opacity": 0 },
    { "type": "line", "id": "l-elder", "fromId": "n-cherry", "toId": "n-elder", "opacity": 0 },
])

hc_steps = [
    {
        "id": "s1", "label": "apple 삽입", "duration": 800,
        "keyframes": {
            "hash-func": { "label": "hash('apple') = 2", "fill": "#fbbf24" },
            "n-apple": { "opacity": 1 },
            "l-apple": { "opacity": 1 },
            "b2": { "fill": "#dcfce3" },
            "step-label": { "content": "'apple' 추가 -> 버킷 2" }
        }, "effects": [{"type": "highlight", "elementId": "b2"}]
    },
    {
        "id": "s2", "label": "banana 삽입", "duration": 800,
        "keyframes": {
            "hash-func": { "label": "hash('banana') = 4", "fill": "#fbbf24" },
            "n-banana": { "opacity": 1 },
            "l-banana": { "opacity": 1 },
            "b4": { "fill": "#fef08a" },
            "step-label": { "content": "'banana' 추가 -> 버킷 4" }
        }, "effects": [{"type": "highlight", "elementId": "b4"}]
    },
    {
        "id": "s3", "label": "cherry 삽입 (충돌)", "duration": 1000,
        "keyframes": {
            "hash-func": { "label": "hash('cherry') = 2", "fill": "#f87171" },
            "n-cherry": { "opacity": 1 },
            "l-cherry": { "opacity": 1 },
            "b2": { "fill": "#fecaca" },
            "step-label": { "content": "'cherry' 추가 -> 버킷 2 (충돌 발생! 체이닝 연결)" }
        }, "effects": [{"type": "highlight", "elementId": "n-apple", "color": "#f87171"}]
    },
    {
        "id": "s4", "label": "date 삽입", "duration": 800,
        "keyframes": {
            "hash-func": { "label": "hash('date') = 0", "fill": "#fbbf24" },
            "n-date": { "opacity": 1 },
            "l-date": { "opacity": 1 },
            "b0": { "fill": "#e9d5ff" },
            "step-label": { "content": "'date' 추가 -> 버킷 0" }
        }, "effects": [{"type": "highlight", "elementId": "b0"}]
    },
    {
        "id": "s5", "label": "elder 삽입 (충돌)", "duration": 1000,
        "keyframes": {
            "hash-func": { "label": "hash('elder') = 2", "fill": "#f87171" },
            "n-elder": { "opacity": 1 },
            "l-elder": { "opacity": 1 },
            "b2": { "fill": "#fed7aa" },
            "step-label": { "content": "'elderberry' 추가 -> 버킷 2 (또 충돌! 체이닝 확장)" }
        }, "effects": [{"type": "highlight", "elementId": "n-cherry", "color": "#f87171"}]
    },
    {
        "id": "s6", "label": "리셋", "duration": 600,
        "keyframes": {
            "hash-func": { "label": "hash(key) % 5", "fill": "#e0e7ff" },
            "n-apple": { "opacity": 0 }, "l-apple": { "opacity": 0 },
            "n-banana": { "opacity": 0 }, "l-banana": { "opacity": 0 },
            "n-cherry": { "opacity": 0 }, "l-cherry": { "opacity": 0 },
            "n-date": { "opacity": 0 }, "l-date": { "opacity": 0 },
            "n-elder": { "opacity": 0 }, "l-elder": { "opacity": 0 },
            "b0": { "fill": "#f1f5f9" }, "b2": { "fill": "#f1f5f9" }, "b4": { "fill": "#f1f5f9" },
            "step-label": { "content": "해시 테이블 충돌과 체이닝(Chaining)" }
        }, "effects": []
    }
]

hc_json = {
    "version": 2,
    "id": "hash-collision",
    "title": "Hash Collision & Chaining",
    "description": "해시 충돌 시 Linked List를 통한 Chaining 해결 방법",
    "category": "algorithm",
    "tags": ["hash", "collision", "chaining", "datastructure"],
    "canvas": { "width": 800, "height": 500, "background": "transparent" },
    "elements": hc_elements,
    "initiallyHidden": [],
    "steps": hc_steps,
    "settings": { "loop": True, "autoplay": True, "stepGapMs": 200 }
}
write_json("/Users/koa/100-github-io/public/animations/hash-collision.json", hc_json)
