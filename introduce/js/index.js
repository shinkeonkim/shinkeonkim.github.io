window.onload = function () {
    _init_sticky_element_observer()
    set_copyright_text()
    
}

function set_copyright_text() {
    const current_year = new Date().getFullYear()
    const copyright_element = document.querySelector("#js-copyright")
    copyright_element.innerHTML = "Copyright © " + current_year + " shinkeonkim"
}

function _init_sticky_element_observer() {
    const sticky_element = document.querySelector('header')
    const observer = new IntersectionObserver(
        ([e]) => e.target.classList.toggle('js-is-sticky', e.intersectionRatio < 1),
        {threshold: [1]}
    );
    observer.observe(sticky_element)
}