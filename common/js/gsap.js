/*--------------------------------------------------------------
1. 플러그인 등록 및 전역 변수 설정
--------------------------------------------------------------*/
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

let scrollerSmoother = null; 
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
const simplex = new SimplexNoise();
const circles = [];
const totalCircles = 2000; // 개수를 줄여서 원들 사이의 간격(여백)을 확보합니다.

/*--------------------------------------------------------------
2. 데이터 생성: 스프링 파동 구조로 배치하는 로직
--------------------------------------------------------------*/
for (let i = 0; i < totalCircles; i++) {
    const n1 = simplex.noise2D(i * 0.003, i * 0.0033);
    
    // [핵심 수정] 픽셀(1200) 대신 -1 ~ 1 사이의 '강도'만 계산합니다.
    const baseFlow = simplex.noise2D(i * 0.001, 0.1); // -1 ~ 1
    const midVariance = simplex.noise2D(i * 0.008, 0.5) * 0.4; // 미세 변칙 강도
    
    circles.push({
        // xRatio는 -1.4 ~ 1.4 사이의 비율값이 됩니다.
        xRatio: baseFlow + midVariance, 
        
        y: i * 8, 
        yGap: i / totalCircles, 
        rotation: simplex.noise2D(i * 0.02, 0) * 360, 
        scale: 30 + n1 * 20, 
        color: `hsla(${Math.floor(i * 0.5)}, 80%, 60%, 0.6)` 
    });
}

/*--------------------------------------------------------------
3. 드로잉 및 리사이즈 함수 (블러 없이 선으로만 최적화)
--------------------------------------------------------------*/
function draw(progress = 0) {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const startOffset = 0.06; 
    const currentProgress = progress + startOffset;

    circles.forEach((c) => {
        if (c.yGap > currentProgress) return;

        const appearance = Math.min(1, (currentProgress - c.yGap) * 20); 

        // [핵심 수정] 화면 너비의 40%만큼만 좌우로 움직이게 설정 (중앙 기준 좌우 40% = 총 80% 영역 사용)
        // 이렇게 하면 원이 화면 밖으로 절대 나가지 않으면서도 꽉 차게 움직입니다.
        const dynamicX = (canvas.width / 2) + (c.xRatio * (canvas.width * 0.4));

        ctx.save();
        ctx.translate(dynamicX, c.y); // 중앙 기준이 이미 dynamicX에 계산됨
        ctx.rotate(c.rotation * Math.PI / 180);
        
        const finalScale = c.scale * appearance;
        ctx.scale(finalScale, finalScale);
        
        ctx.globalAlpha = appearance * 0.8;
        ctx.strokeStyle = c.color; 
        ctx.lineWidth = 0.1;
        
        ctx.beginPath();
        ctx.arc(0, 0, 1.2, 0, Math.PI * 2); 
        ctx.stroke(); 
        ctx.restore();
    });
}

function resize() {
    if (!canvas) return;
    canvas.width = window.innerWidth;
    // 전체 페이지 높이만큼 그릴 수 있도록 설정 (줄이 길게 이어지도록)
    canvas.height = document.documentElement.scrollHeight;
    
    const bgTrigger = ScrollTrigger.getById("bgTrigger");
    if (bgTrigger) draw(bgTrigger.progress);
    else draw(0);
}

/*--------------------------------------------------------------
4. 테마 전환 함수 (배경색/텍스트색)
--------------------------------------------------------------*/
const initBgColorChange = () => {
    const scrollThemes = [
        // 1. 흰색 배경 -> 검정 커서
        { trigger: ".intro", bgColor: "#ffffff", textColor: "#000000", cursorColor: "#000000" },
        // 2. 검정 배경 -> 흰색 커서
        { trigger: ".start", bgColor: "#1a1a1a", textColor: "#ffffff", cursorColor: "#ffffff" },
        // 3. 연두 배경 -> 검정 커서 (대비 확보)
        { trigger: ".end", bgColor: "#87cd33", textColor: "#000000", cursorColor: "#000000" }
    ];

    const changeTheme = (theme) => {
        gsap.to("body", { backgroundColor: theme.bgColor, duration: 0.3 });
        gsap.to(".wrapper.text", { color: theme.textColor, duration: 0.3 });
        
        // [핵심 추가] 테마에 맞는 커서 색상으로 부드럽게 변경
        gsap.to(".cursor", { backgroundColor: theme.cursorColor, duration: 0.3 });
        gsap.to(".cursor-follower", { borderColor: theme.cursorColor, duration: 0.3 });
    };

    scrollThemes.forEach((theme, index) => {
        ScrollTrigger.create({
            trigger: theme.trigger,
            start: "top center",
            end: "bottom center",
            onEnter: () => changeTheme(theme),
            onEnterBack: () => changeTheme(theme),
            onLeaveBack: () => {
                if (index > 0) changeTheme(scrollThemes[index - 1]);
            }
        });
    });
};

/*--------------------------------------------------------------
5. 메인 실행 함수 (showDemo)
--------------------------------------------------------------*/
const showDemo = () => {
    gsap.to(".loader", { autoAlpha: 0, duration: 0.5 });
    document.body.style.overflow = 'auto';

    scrollerSmoother = ScrollSmoother.create({
        content: ".allWrapper",
        wrapper: '.layoutContent',
        smooth: 1.2,
        effects: false
    });

    resize();
    window.addEventListener('resize', resize);

    // 캔버스용 스크롤 트리거 (페이지 전체 진행도와 연동)
    gsap.to({}, {
        scrollTrigger: {
            id: "bgTrigger",
            trigger: ".allWrapper",
            start: "top top",
            end: "bottom bottom",
            scrub: 2, 
            onUpdate: (self) => draw(self.progress)
        }
    });

    // 섹션별 텍스트 애니메이션 (반응형)
    let mm = gsap.matchMedia();
    gsap.utils.toArray('section').forEach((section, index) => {
        const w = section.querySelector('.wrapper');
        if (!w) return;

        mm.add({ isDesktop: "(min-width: 1024px)", isMobile: "(max-width: 1023px)" }, (context) => {
            let { isDesktop } = context.conditions;
            const winW = window.innerWidth;

            let xStart = () => {
                const txt = w.textContent;
                // [1. PC 환경] 기존 수치 그대로 유지하여 역동성 확보
                if (isDesktop) {
                    if (txt.includes("Project Archive")) return winW * -0.8;
                    if (txt.includes("Digital Experiences")) return winW * 0.8;
                    if (txt.includes("Crafting Principled")) return winW * -0.5;
                    if (txt.includes("UI through Technical")) return winW * 0.3;
                    if (txt.includes("Integrity and User-")) return winW * -0.2;
                    if (txt.includes("Centric Design")) return winW * 0.5;
                    // return (index % 2) ? winW : (w.scrollWidth * -1);
                    const gap = winW * 0.4; 
                    return (index % 2) ? gap : -gap;
                } 
                // [2. 모바일 환경] 방향(지그재그)은 유지하되 수치는 화면 안으로 제한
                else {
                    // 홀수/짝수 인덱스에 따라 왼쪽(-), 오른쪽(+) 번갈아가며 시작
                    const moveDist = winW * 0.6; // 화면 너비의 60% 정도만 밖에서 시작
                    if (txt.includes("Project Archive")) return winW * -0.1;
                    if (txt.includes("Digital Experiences")) return winW * -0.1;
                    if (txt.includes("Crafting Principled")) return winW * 0.1;
                    if (txt.includes("UI through Technical")) return winW * -0.1;
                    if (txt.includes("Integrity and User-")) return winW * 0.1;
                    if (txt.includes("Centric Design")) return winW * -0.1;
                    return 0;
                }
            };

            let xEnd = () => {
                const txt = w.textContent;
                // [1. PC 환경] 기존 목적지 유지
                if (isDesktop) {
                    if (txt.includes("Project Archive")) return winW * 0.1;
                    if (txt.includes("Digital Experiences")) return winW * -0.3;
                    if (txt.includes("Crafting Principled")) return winW * -0.1;
                    if (txt.includes("UI through Technical")) return winW * 0;
                    if (txt.includes("Integrity and User-")) return winW * -0.05;
                    if (txt.includes("Centric Design")) return winW * 0;
                    const offset = winW * 0.15; // 화면 너비의 10%만큼 더 이동해서 멈춤
                    return (index % 2) ? -offset : offset;
                } 
                // [2. 모바일 환경] 목적지는 거의 중앙(0) 근처로 고정하여 화면 이탈 방지
                else {
                    return 0; // 모바일에선 깔끔하게 제자리로 도착
                }
            };

            // 섹션별 텍스트 애니메이션 부분 수정
            gsap.fromTo(w, { 
                x: xStart, 
                opacity: 1, 
                // [수정] 모바일일 때는 뒤틀림(skewX)을 0으로 설정
                skewX: isDesktop ? -10 : 0 
            }, {
                x: xEnd,
                opacity: 1,
                // [수정] 목적지에서도 뒤틀림을 0으로 고정
                skewX: 0,
                scrollTrigger: { 
                    trigger: section, 
                    scrub: 1, 
                    invalidateOnRefresh: true 
                }
            });
        });
    });

    // 커서 로직
    const cursor = document.querySelector('.cursor');
    const follower = document.querySelector('.cursor-follower');
    window.addEventListener('mousemove', (e) => {
        gsap.to(cursor, { x: e.clientX, y: e.clientY, duration: 0.1 });
        gsap.to(follower, { x: e.clientX - 24, y: e.clientY - 24, duration: 0.3 });
    });

    // 갤러리 리빌 효과 (모바일에서는 애니메이션 없이 고정)
    gsap.utils.toArray('.gallery li').forEach((li) => {
        // 1. 모바일(터치 디바이스)인 경우 즉시 reveal 클래스 추가 후 종료
        if (ScrollTrigger.isTouch) {
            li.classList.add('reveal');
            return; 
        }

        // 2. PC(데스크탑) 환경에서만 기존 스크롤 트리거 작동
        ScrollTrigger.create({
            trigger: li,
            start: "top 70%", 
            onEnter: () => li.classList.add('reveal'),
            once: true
        });
    });

    initBgColorChange();
    ScrollTrigger.refresh();
};

/*--------------------------------------------------------------
6. 이미지 로딩 완료 대기 및 실행
--------------------------------------------------------------*/
const allImages = gsap.utils.toArray('img');
if (allImages.length > 0) {
    imagesLoaded(allImages).on('always', showDemo);
} else {
    showDemo();
}