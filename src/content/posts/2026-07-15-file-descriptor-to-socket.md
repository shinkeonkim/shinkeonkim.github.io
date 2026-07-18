---
title: "파일 디스크립터부터 소켓까지, 하나로 이어지는 흐름"
description: "파일도 소켓도 결국 fd 하나로 다뤄진다. open, read, write, close, socket, send 까지 하나의 흐름으로 이어보는 Unix I/O 의 통합 추상화."
date: 2026-07-15
tags: [file-descriptor, io, socket, unix, linux, system-call, kernel, network]
category: "OS"
---

## 시작 의문

Unix 계열 (Linux, macOS, BSD) 에서 파일도, 소켓도, 파이프도, 심지어 터미널도 같은 함수로 읽는다.

```c
char buf[1024];
read(fd, buf, sizeof(buf));  // 파일이든 소켓이든 이걸로 다 읽힘
```

`fd` 자리에 어떤 자원이 오든 동작한다. 처음 보면 좀 신기하다. 파일은 디스크에 있고 소켓은 네트워크를 지나오는 완전히 다른 물건인데 왜 같은 API 가 통할까.

답은 세 계층을 순서대로 이해하면 자연스럽게 풀린다.

1. **파일 디스크립터 (fd)**, 사용자 공간이 커널 자원을 가리키는 정수 번호표.
2. **저수준 파일 I/O**, fd 로 커널에 요청하는 시스템 콜 (`open`, `read`, `write`, `close`, `lseek`).
3. **소켓**, 네트워크 연결이지만 결국 fd 하나로 감싸져 있어 위의 API 가 그대로 통하는 것.

이 순서로 하나씩 풀어보자.

---

## 1. 파일 디스크립터, 정수 하나로 자원을 가리키다

프로세스마다 자기만의 "표" 를 가지고 있다. **파일 디스크립터 테이블 (file descriptor table)** 이다.

각 슬롯은 정수 인덱스 (0, 1, 2, 3, ...) 이고, 커널이 관리하는 자원 (파일, 소켓, 파이프, ...) 을 가리키는 포인터가 들어있다. 사용자 공간에서는 그 정수만 보인다.

프로세스가 시작될 때 3개는 이미 열려 있다.

| fd | 이름 | 기본 연결 |
|:---:|:---|:---|
| 0 | `stdin` | 키보드 (또는 리다이렉트된 입력) |
| 1 | `stdout` | 터미널 (또는 리다이렉트된 출력) |
| 2 | `stderr` | 터미널 (에러용) |

`open()` 을 호출하면 커널이 **가장 작은 빈 슬롯** 을 골라 새 fd 를 할당하고 그 번호를 돌려준다. 그래서 첫 `open` 은 보통 fd 3 을 준다.

```anim:file-descriptor
{}
```

애니메이션에서 왼쪽 상자가 프로세스의 fd 테이블, 오른쪽이 커널이 관리하는 자원이다. `open` 이 호출되면 커널이 File Object 를 만들고 fd 3 슬롯에 그 참조를 꽂아준다. 사용자 코드는 그 정수 3 만 들고 다니면서 `read(3, ...)` 같은 시스템 콜을 부른다.

### 왜 그냥 포인터가 아니라 정수인가?

두 가지 이유가 있다.

**격리**. 사용자 공간이 커널 포인터를 직접 만지면 위험하다. 잘못 건드리면 커널 메모리를 오염시킬 수 있다. 정수 인덱스는 그런 위험 없이 "너의 3번 슬롯" 을 안전하게 가리킨다. 커널은 시스템 콜이 들어올 때마다 fd 를 인덱스로 자기 테이블을 찾아본다.

**fork/exec 상속과 리다이렉트**. 자식 프로세스는 부모의 fd 테이블을 복사받는다. 슬롯 번호까지 그대로. 이 규칙 덕에 셸의 `ls > out.txt` 가 우아하게 동작한다.

```text
1. 셸이 fork()
2. 자식이 fd 1 (stdout) 을 close()
3. 자식이 open("out.txt", O_WRONLY|O_CREAT|O_TRUNC)
   → open 이 "가장 작은 빈 슬롯" 규칙으로 fd 1 을 할당
4. 자식이 exec("ls")
   → ls 는 자기가 stdout 에 쓴다고 생각하지만
     실제로는 out.txt 로 나간다
```

`ls` 는 자기가 리다이렉트됐다는 걸 전혀 모른다. 파일에 쓴다는 것도, 원래 터미널에 나갈 데이터라는 것도 신경 안 쓴다. **그냥 fd 1 에 write 할 뿐이다.** 이 무지 (無知) 가 곧 Unix 파이프라인의 재사용성이다.

### fd 는 프로세스 지역이다

fd 3 은 **어느 프로세스의 fd 3** 이라는 문맥이 있어야 의미가 있다. 프로세스 A 의 fd 3 과 프로세스 B 의 fd 3 은 완전히 다른 자원이다.

커널은 각 프로세스마다 별도의 fd 테이블을 유지한다 (`task_struct.files` 안의 `fdtable`). 그래서 `/proc/<pid>/fd/` 를 살펴보면 그 프로세스가 무엇을 열고 있는지 다 보인다.

```bash
$ ls -l /proc/self/fd
lrwx------ 1 me me 0  0 -> /dev/pts/1
lrwx------ 1 me me 0  1 -> /dev/pts/1
lrwx------ 1 me me 0  2 -> /dev/pts/1
lr-x------ 1 me me 0  3 -> /proc/12345/fd
```

---

## 2. 저수준 파일 I/O, 다섯 개의 시스템 콜

fd 하나만 있으면 파일을 다룰 수 있는 시스템 콜은 사실상 다섯 개다. `open`, `read`, `write`, `close`, `lseek`.

### open(), fd 얻기

```c
#include <fcntl.h>

int fd = open("/tmp/data.txt", O_RDONLY);
if (fd < 0) {
    perror("open");
    return 1;
}
```

- 성공: 새 fd (>= 3 이면 사용자가 연 것)
- 실패: -1, `errno` 세팅

플래그로 열기 모드를 지정한다.

| 플래그 | 의미 |
|:---|:---|
| `O_RDONLY` | 읽기 전용 |
| `O_WRONLY` | 쓰기 전용 |
| `O_RDWR` | 읽기/쓰기 |
| `O_CREAT` | 없으면 생성 (mode 인자 필요) |
| `O_APPEND` | 쓰기가 항상 파일 끝에 |
| `O_TRUNC` | 열면서 파일 내용을 0 으로 잘라냄 |
| `O_NONBLOCK` | 논블로킹 모드 (뒤에서 다시 나온다) |

`O_CREAT` 를 쓸 땐 파일 권한을 명시해야 한다.

```c
int fd = open("out.txt", O_WRONLY | O_CREAT | O_TRUNC, 0644);
```

### read(), write(), 실제 IO

```c
char buf[1024];
ssize_t n = read(fd, buf, sizeof(buf));
// n > 0: 읽은 바이트 수
// n == 0: EOF (더 읽을 것 없음)
// n < 0: 에러, errno 확인

ssize_t written = write(fd, "hello\n", 6);
```

여기서 자주 실수하는 함정 하나. **read/write 는 요청한 만큼 다 처리한다는 보장이 없다.** 짧게 반환하는 게 오히려 흔하다.

- 파일: 대부분 요청한 만큼 오지만, 시그널이 끼어들면 짧게 반환할 수 있다.
- 소켓/파이프: 자주 짧게 반환한다. TCP 는 스트림이라 "여기까지 왔음" 이 임의다.
- 논블로킹 fd: 지금 당장 처리 가능한 만큼만.

그래서 실무 코드는 loop 를 돌려야 한다.

```c
ssize_t write_all(int fd, const void *buf, size_t len) {
    const char *p = buf;
    size_t remaining = len;
    while (remaining > 0) {
        ssize_t n = write(fd, p, remaining);
        if (n < 0) {
            if (errno == EINTR) continue;  // 시그널이 끼어들면 재시도
            return -1;
        }
        p += n;
        remaining -= n;
    }
    return len;
}
```

`read` 도 마찬가지 패턴이 필요하다.

### close(), fd 반환

```c
close(fd);
```

fd 슬롯을 해제한다. 커널 안의 자원 (File Object) 은 참조 카운트가 0 이 되면 함께 해제된다.

`close` 를 안 부르면 어떻게 될까? **fd leak** 이다. 프로세스마다 열 수 있는 fd 개수에 상한이 있다 (`ulimit -n`, 보통 1024 에서 65535 사이). 장시간 도는 서버가 매 요청마다 fd 를 열고 닫지 않으면 결국 `open` 이 `EMFILE` (Too many open files) 로 실패하기 시작한다. 파일뿐 아니라 소켓 leak 도 같은 이유로 서버를 죽인다.

### lseek(), 파일 커서

파일은 "지금 어디까지 읽었는지" 를 나타내는 커서를 가진다. 커널이 File Object 안에 offset 을 유지한다. `read` 하면 그만큼 앞으로 나가고, `write` 하면 그만큼 앞으로 나가면서 덮어쓴다.

```c
lseek(fd, 0, SEEK_SET);   // 처음으로
lseek(fd, 0, SEEK_END);   // 끝으로 (파일 크기 반환값으로 얻음)
lseek(fd, 100, SEEK_CUR); // 현재 위치에서 100 앞으로
```

> [!NOTE]
> **소켓/파이프에는 커서가 없다.** `lseek` 를 소켓에 호출하면 `ESPIPE` (Illegal seek) 로 실패한다. 파일이라는 "위치가 있는 자원" 에만 의미가 있는 연산.

### stdio (fopen/fread/...) 는 위의 wrapper 다

C 표준 라이브러리의 `fopen`, `fread`, `fwrite`, `fclose` 는 위 저수준 API 위에 **버퍼링** 을 얹은 것이다. `FILE*` 는 실체가 이렇게 생겼다.

```text
FILE {
    int fd;               // 안에 파일 디스크립터가 있음
    char *buffer;         // 사용자 공간 버퍼
    size_t buf_pos;
    int mode;
    ...
}
```

버퍼 크기만큼 시스템 콜을 모아서 한 번에 처리하므로 매번 `write` 하는 것보다 빠르다. 필요할 때 `fileno(fp)` 로 안의 fd 를 꺼낼 수도 있다.

버퍼링의 함정은 **flush 를 안 하면 데이터가 아직 커널로 안 갔을 수 있다** 는 점. `printf` 뒤에 크래시가 나면 그 로그가 안 남기도 한다. `fflush(stdout)` 또는 `setvbuf` 로 버퍼 정책을 바꿀 수 있다.

---

## 3. 소켓, 결국 fd 다

여기서 이 글의 핵심 반전이 나온다. 네트워크 소켓도 결국 fd 하나다.

```c
#include <sys/socket.h>

int sfd = socket(AF_INET, SOCK_STREAM, 0);
```

`socket()` 은 새 파일 디스크립터를 반환한다. 커널이 내부적으로 `sock` 구조체를 만들고, 프로세스 fd 테이블의 빈 슬롯에 그 참조를 꽂는다. 파일 열 때와 완전히 같은 패턴.

인자는 세 개.

- `AF_INET`: 주소 체계 (IPv4). IPv6 는 `AF_INET6`, 로컬 유닉스 소켓은 `AF_UNIX`.
- `SOCK_STREAM`: 연결 기반 스트림 (TCP). 데이터그램은 `SOCK_DGRAM` (UDP).
- 프로토콜: 대부분 0 (기본값) 이면 알아서.

### 클라이언트 흐름

```c
int sfd = socket(AF_INET, SOCK_STREAM, 0);

struct sockaddr_in addr = {
    .sin_family = AF_INET,
    .sin_port = htons(8080),
};
inet_pton(AF_INET, "93.184.216.34", &addr.sin_addr);

connect(sfd, (struct sockaddr *)&addr, sizeof(addr));

// 여기서부터 파일이랑 100% 동일한 인터페이스
write(sfd, "GET / HTTP/1.1\r\nHost: example.com\r\n\r\n", 39);

char buf[4096];
ssize_t n = read(sfd, buf, sizeof(buf));

close(sfd);
```

`connect` 로 TCP 3-way handshake 가 끝나고 나면 그 뒤엔 그냥 `read`/`write`/`close`. 파일과 다른 API 를 배울 필요가 없다.

`send`/`recv` 라는 소켓 전용 함수도 있지만, 인자에 플래그 하나 더 붙는 것 (`MSG_DONTWAIT`, `MSG_NOSIGNAL` 등) 말고는 `read`/`write` 와 사실상 같은 함수다.

### 서버 흐름

```c
int listener = socket(AF_INET, SOCK_STREAM, 0);
bind(listener, ...);       // 로컬 주소:포트 잡기
listen(listener, 128);     // 백로그 큐 크기

while (1) {
    int client = accept(listener, NULL, NULL);  // ← 새 fd 하나 반환
    write(client, "HTTP/1.1 200 OK\r\n\r\nhi", 22);
    close(client);
}
```

`accept()` 가 새 클라이언트 연결마다 새 fd 를 하나씩 만들어준다. `listener` fd 는 그대로 두고, 각 클라이언트는 별도의 fd 로 다룬다. 100 클라이언트가 동시에 붙어있으면 fd 가 101 개 열려 있는 상태 (listener 1 + 클라이언트 100).

여기서 아까 얘기한 **fd 상한** 이 서버의 동시 접속 상한을 결정한다. `ulimit -n 65535` 같은 튜닝이 필요한 이유.

### 왜 파일 API 가 소켓에 그대로 통하나?

커널이 fd 뒤의 자원을 **다형적** 으로 다루기 때문이다. Linux 커널에서는 각 자원 (파일, 소켓, 파이프, ...) 이 자기만의 함수 테이블을 갖는다.

```c
// 개념적 스케치 (실제 Linux 커널의 struct file_operations)
struct file_operations {
    ssize_t (*read)(struct file *, char __user *, size_t, loff_t *);
    ssize_t (*write)(struct file *, const char __user *, size_t, loff_t *);
    int (*release)(struct inode *, struct file *);   // close
    ...
};
```

파일이면 ext4/xfs 의 read 함수, 소켓이면 소켓 서브시스템의 read 함수, 파이프면 파이프의 read 함수가 이 테이블에 꽂혀 있다. 시스템 콜 `read(fd, ...)` 가 들어오면 커널은:

1. 현재 프로세스의 fd 테이블에서 fd 번호로 `struct file *` 을 찾는다.
2. 그 `file->f_op->read` 를 부른다.

사용자 공간에서 봤을 때 인터페이스가 하나 (`read`) 지만, 커널 내부에서는 자원마다 다른 구현이 호출된다. 객체지향의 다형성 (polymorphism) 이 C 로 구현된 셈. 이게 Unix 의 **"Everything is a File"** 철학의 실체다.

"모든 게 파일이다" 는 은유가 아니라 **"모든 자원을 fd 로 접근한다, 그리고 fd 뒤에는 read/write/close 같은 공통 인터페이스를 구현한 커널 객체가 있다"** 는 뜻이다.

---

## 4. 통합의 보너스, select / poll / epoll

fd 가 통합돼 있어서 얻는 아주 실용적인 보너스가 하나 있다. **여러 종류의 자원을 한꺼번에 감시할 수 있다는 것.**

한 프로세스가 다음 세 개를 동시에 봐야 한다고 하자.

- 표준 입력에서 사용자 명령이 들어오는지 (fd 0)
- 파일 하나가 갱신됐는지 (fd 3)
- 소켓 하나에 응답이 도착했는지 (fd 4)

원래 문제였다면 세 개 감시 API 를 따로 배웠어야 한다. 그런데 셋 다 fd 이므로 하나의 API 로 다룰 수 있다.

```c
#include <poll.h>

struct pollfd fds[3] = {
    { .fd = 0,       .events = POLLIN },  // stdin
    { .fd = file_fd, .events = POLLIN },
    { .fd = sock_fd, .events = POLLIN },
};

int n = poll(fds, 3, -1);  // 셋 중 하나라도 read 준비되면 즉시 리턴

for (int i = 0; i < 3; i++) {
    if (fds[i].revents & POLLIN) {
        char buf[1024];
        read(fds[i].fd, buf, sizeof(buf));  // fd 로 다형 dispatch
        // ... 처리
    }
}
```

Linux 의 `epoll`, BSD 의 `kqueue`, 오래된 `select` 도 정확히 같은 원리로 fd 를 감시한다. **fd 통합이 없었다면 이 API 들이 존재할 수 없다.** nginx, Node.js, Nginx event loop, Go 의 netpoller, 전부 이 위에 세워진 구조다.

---

## 5. 정리, 한 그림으로

여섯 문장으로 요약한다.

1. 프로세스는 **fd 테이블** 을 갖는다. 각 슬롯은 정수 인덱스이고, 커널이 관리하는 자원을 가리킨다.
2. `open` 은 파일을 열고 **가장 작은 빈 fd** 를 돌려준다. 0/1/2 는 이미 stdin/stdout/stderr 에 쓰인다.
3. **저수준 파일 I/O** (`read`, `write`, `close`, `lseek`) 는 그 fd 하나로 파일을 다룬다. 언제나 짧은 반환에 대비한 loop 가 필요하다.
4. `socket()` 도 새 fd 를 준다. `connect` 로 연결한 뒤엔 파일과 완전히 같은 `read`/`write`/`close` API 가 통한다.
5. 이게 가능한 이유는 커널이 fd 뒤에 **다형적 함수 테이블** (파일이면 ext4 함수, 소켓이면 소켓 함수) 을 두고 시스템 콜을 dispatch 하기 때문이다.
6. 통합의 보너스로 `poll`/`epoll` 이 파일, 소켓, 파이프, 터미널을 한 번에 감시할 수 있다.

`fopen("data.txt")` 한 줄, `socket(AF_INET, SOCK_STREAM, 0)` 한 줄 뒤에는 이 fd 테이블이 조용히 움직이고 있다. Python 의 `open`, Go 의 `os.File`, Node.js 의 `fs.createReadStream`, Java 의 `FileInputStream` 도 결국 안에서는 저수준 시스템 콜을 통해 fd 를 열고 그 정수를 감싼 객체를 돌려준다. 언어가 다를 뿐 커널이 보는 그림은 같다.

그러니 다음에 `write(1, "hi\n", 3)` 를 볼 때, "저 1 이 fd 1, 즉 stdout 이고, 커널의 file 객체를 거쳐 실제 터미널 드라이버로 흘러가는구나" 하고 한 걸음 뒤로 보면 좋겠다. 그 관점 하나가 파일, 네트워크, 파이프, 리다이렉트, 이벤트 루프까지 전부 같은 언어로 설명해준다.
