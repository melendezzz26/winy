// Garments are drawn in each original illustration's coordinates. Foreground
// fur, wings, paws and the condor's ruff cover the cloth where they should.
const SHAPES = {
  cuy: {
    cloth: 'M354 635Q590 702 892 625L860 742Q760 811 662 876Q488 816 392 730Z',
    fold: 'M392 689Q613 757 858 680M662 876Q642 790 626 722M417 706Q520 751 576 796',
    edge: 'M408 717Q513 790 660 850Q765 784 844 728',
    foreground: 'M0 0H1254V580L1001 592 951 641 926 627 898 662 871 649 827 679 788 667 744 696 710 677 665 684 628 660 604 684 560 669 518 690 478 674 437 683 395 659 361 666 320 636 0 636Z M0 745L341 747Q430 758 534 805L578 854Q541 912 454 898L0 975Z M1254 730L929 744Q820 757 787 819L767 853Q789 910 868 894L1254 946Z'
  },
  llama: {
    cloth: 'M410 622Q528 662 649 618L661 707Q597 765 550 813Q479 747 407 704Z',
    fold: 'M414 662Q531 711 651 660M550 813Q560 749 547 699M435 695Q482 738 511 746',
    edge: 'M425 697Q484 748 548 790Q596 747 645 704',
    foreground: 'M0 0H1254V560L771 573 742 594 710 595 689 614 659 611 635 630 600 628 578 618 556 636 523 620 495 630 468 612 435 614 412 589 0 580Z'
  },
  gallito: {
    cloth: 'M578 518Q756 570 907 546L914 663Q829 744 764 816Q670 709 601 656Z',
    fold: 'M605 578Q747 627 906 596M764 816Q774 716 756 615M643 644Q691 700 721 714',
    edge: 'M631 650Q692 733 764 790Q846 710 900 660',
    foreground: 'M0 0H1254V498L956 509 924 528 900 523 880 546 857 530 840 552 809 536 794 556 766 539 742 555 708 540 682 555 648 539 620 553 584 535 0 532Z M0 552L473 570Q582 558 615 621Q667 698 609 816Q493 1002 242 1110L0 1254Z'
  },
  condor: {
    cloth: 'M489 573Q703 710 958 569L918 782Q846 858 779 938Q664 864 558 763Z',
    fold: 'M552 721Q729 819 921 721M779 938Q749 837 754 777M595 762Q657 800 689 852',
    edge: 'M577 774Q675 850 778 912Q850 836 901 790',
    foreground: 'M0 0H1254V500L1040 500 969 600 948 662 935 698 909 760 907 723 876 775 864 734 818 790 816 756 787 815 733 770 713 734 690 759 650 709 641 729 616 686 598 714 564 661 560 681 531 624 524 653 500 612 478 580 453 598 455 550 408 597 408 549 437 516 409 532 0 500Z'
  }
};
export function scarfLayers(id, file, uid) {
  const shape = SHAPES[id], gradient = `${uid}-cloth`, mask = `${uid}-body`, foreground = `${uid}-fur`;
  return {
    defs: `<linearGradient id="${gradient}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ef9c70"/><stop offset=".43" stop-color="#d96045"/><stop offset="1" stop-color="#9c392c"/></linearGradient><mask id="${mask}" class="pet-body-mask" x="0" y="0" width="1254" height="1254" maskUnits="userSpaceOnUse"><image href="assets/pets/${file}" width="1254" height="1254"/></mask><clipPath id="${foreground}"><path d="${shape.foreground}"/></clipPath>`,
    front: `<g mask="url(#${mask})"><path d="${shape.cloth}" transform="translate(0 10)" fill="#29130c" opacity=".28"/><path d="${shape.cloth}" fill="url(#${gradient})" stroke="#54281d" stroke-width="9" stroke-linejoin="round"/><path d="${shape.fold}" fill="none" stroke="#a13a2c" stroke-width="10" stroke-linecap="round"/><path d="${shape.edge}" fill="none" stroke="#f6bc87" stroke-width="5" stroke-dasharray="8 9" stroke-linecap="round"/></g>`,
    foreground: `<image class="pet-foreground" href="assets/pets/${file}" width="1254" height="1254" clip-path="url(#${foreground})"/>`
  };
}
