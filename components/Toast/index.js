/* toast组件 */

function initComponent() {
  return {
    timer1: null,
    timer2: null,
    timer3: null,
    default: {
      duration: 1000 //默认显示1s
    },
    data: {
      content: "",
      show: false
    },
    show: function(msg, options) {
      console.log(this);
      this.setData({
        show: false,
        content: ""
      });
      clearTimeout(this.timer1);
      clearTimeout(this.timer2);
      clearTimeout(this.timer3);
      this.timer1 = setTimeout(() => {
        this.setData({
          content: msg,
          show: true
        });
        let duration;
        if (options && options.duration) {
          duration = Number(options.duration);
        }
        if (!Number.isSafeInteger(duration)) {
          duration = this.default.duration;
        }
        this.timer2 = setTimeout(() => {
          this.setData({
            show: false
          });
          this.timer3 = setTimeout(() => {
            this.setData({
              content: ""
            });
          }, 500);
        }, duration);
      });
    }
  };
}

export { initComponent };
