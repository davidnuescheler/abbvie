import { createTag } from "../../scripts.js";

export default function decorate($block) {
    const $carouselNav = createTag('div', { class: 'carousel-nav'});;
    [...$block.children].forEach (($row, i) => { 
        const $navItem = createTag('div', { class: 'carousel-nav-item'});
        $carouselNav.appendChild($navItem);
        if (i) {
            $row.classList.add('hidden');
        } else {
            $navItem.classList.add('selected');
        }
    });
    $block.appendChild($carouselNav);
} 