/*--------------------------------------------------------------
1. 플러그인 등록 및 전역 변수 설정
--------------------------------------------------------------*/
gsap.registerPlugin(ScrollTrigger, ScrollSmoother);

let scrollerSmoother = null; 
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
const simplex = new SimplexNoise();
const circles = [];
const totalCircles = 2500;

/*--------------------------------------------------------------
2. 데이터 생성: 스프링 파동 구조로 배치하는 로직
--------------------------------------------------------------*/
for (let i = 0; i < totalCircles; i++) {
    const n1 = simplex.noise2D(i * 0.003, i * 0.0033);
    
    const baseFlow = simplex.noise2D(i * 0.001, 0.1); // -1 ~ 1
    const midVariance = simplex.noise2D(i * 0.008, 0.5) * 0.4; // 미세 변칙 강도
    
    circles.push({
        xRatio: baseFlow + midVariance, 
        
        y: i * 8, 
        yGap: i / totalCircles, 
        rotation: simplex.noise2D(i * 0.02, 0) * 360, 
        scale: 30 + n1 * 20, 
        color: `hsla(${Math.floor(i * 0.5)}, 80%, 60%, 0.6)` 
    });
}

/*--------------------------------------------------------------
3. 드로잉 및 리사이즈 함수
--------------------------------------------------------------*/
function draw(progress = 0) {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const startOffset = 0.06; 
    const currentProgress = progress + startOffset;

    circles.forEach((c) => {
        if (c.yGap > currentProgress) return;

        const appearance = Math.min(1, (currentProgress - c.yGap) * 20); 
        const dynamicX = (canvas.width / 2) + (c.xRatio * (canvas.width * 0.4));

        ctx.save();
        ctx.translate(dynamicX, c.y);
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
        { trigger: ".intro", bgColor: "#ffffff", textColor: "#000000", cursorColor: "#000000" },
        { trigger: ".start", bgColor: "#1a1a1a", textColor: "#ffffff", cursorColor: "#ffffff" },
        { trigger: ".end", bgColor: "#87cd33", textColor: "#000000", cursorColor: "#000000" }
    ];

    const changeTheme = (theme) => {
        // 사파리 대응을 위해 body에 직접 스타일 적용
        gsap.to(".bg-overlay", { 
            backgroundColor: theme.bgColor, 
            duration: 0.4, 
            overwrite: "auto",
            ease: "power2.inOut" 
        });
        
        gsap.to(".bg-overlay", { backgroundColor: theme.bgColor, duration: 0.3 });
        gsap.to(".wrapper.text", { color: theme.textColor, duration: 0.3 });
        
        // 테마에 맞는 커서 색상으로 부드럽게 변경
        gsap.to(".cursor", { backgroundColor: theme.cursorColor, duration: 0.3 });
        gsap.to(".cursor-follower", { borderColor: theme.cursorColor, duration: 0.3 });
    };

    scrollThemes.forEach((theme, index) => {
        ScrollTrigger.create({
            trigger: theme.trigger,
            start: "top 60%",
            end: "bottom 60%",
            fastScrollEnd: true,// 사파리 스크롤 버벅임 대응: fastScrollEnd 추가
            anticipagePin: 1,
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

    let mm = gsap.matchMedia();
    gsap.utils.toArray('section').forEach((section, index) => {
        const w = section.querySelector('.wrapper');
        if (!w) return;

        mm.add({ isDesktop: "(min-width: 1024px)", isMobile: "(max-width: 1023px)" }, (context) => {
            let { isDesktop } = context.conditions;
            const winW = window.innerWidth;

            let xStart = () => {
                const txt = w.textContent;
                // PC 환경 출발지
                if (isDesktop) {
                    if (txt.includes("Project Archive")) return winW * -0.8;
                    if (txt.includes("Digital Experiences")) return winW * 0.8;
                    if (txt.includes("Crafting Principled")) return winW * -0.5;
                    if (txt.includes("UI through Technical")) return winW * 0.3;
                    if (txt.includes("Integrity and User-")) return winW * -0.2;
                    if (txt.includes("Centric Design")) return winW * 0.5;

                    const gap = winW * 0.4; 
                    return (index % 2) ? gap : -gap;
                } 
                else {
                    const moveDist = winW * 0.6;
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
                // PC 환경 목적지
                if (isDesktop) {
                    if (txt.includes("Project Archive")) return winW * 0.1;
                    if (txt.includes("Digital Experiences")) return winW * -0.3;
                    if (txt.includes("Crafting Principled")) return winW * -0.1;
                    if (txt.includes("UI through Technical")) return winW * 0;
                    if (txt.includes("Integrity and User-")) return winW * -0.05;
                    if (txt.includes("Centric Design")) return winW * 0;
                    const offset = winW * 0.15;
                    return (index % 2) ? -offset : offset;
                } 
                else {
                    return 0; // 모바일 화면 이탈방지
                }
            };

            // 섹션별 텍스트 애니메이션 부분 수정
            gsap.fromTo(w, { 
                x: xStart, 
                opacity: 1, 
                skewX: isDesktop ? -10 : 0 
            }, {
                x: xEnd,
                opacity: 1,
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

    // 갤러리 리빌 효과
    gsap.utils.toArray('.gallery li').forEach((li) => {
        // 1. 모바일 경우 즉시 reveal 클래스 추가 후 종료
        if (ScrollTrigger.isTouch) {
            li.classList.add('reveal');
            return; 
        }

        // 2. PC 환경에서만 기존 스크롤 트리거 작동
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

window.addEventListener("load", () => {
    setTimeout(() => {
        ScrollTrigger.refresh();
    }, 100);
});

// 아이폰 주소창 변화 대응
window.addEventListener("resize", () => {
    ScrollTrigger.refresh();
});

/*--------------------------------------------------------------
6. 이미지 로딩 완료 대기 및 실행
--------------------------------------------------------------*/
const allImages = gsap.utils.toArray('img');
if (allImages.length > 0) {
    imagesLoaded(allImages).on('always', showDemo);
} else {
    showDemo();
}

window.addEventListener('scroll', function() {
  const scrInfo = document.querySelector('.scrInfo');
  
  if (window.scrollY > 0) {
    // 스크롤이 시작되면 hide 클래스 추가
    scrInfo.classList.add('hide');
  } else {
    // 맨 위로 돌아오면 다시 표시 (선택 사항)
    scrInfo.classList.remove('hide');
  }
});