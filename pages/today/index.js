//index.js
//获取应用实例
const app = getApp()
const weatherIcon = {
    'CLEAR_DAY': 'icon-sun', //晴天
    'CLEAR_NIGHT': 'icon-moon', //晴夜
    'PARTLY_CLOUDY_DAY': 'icon-cloud', //多云
    'PARTLY_CLOUDY_NIGHT': 'icon-cloud-night', //多云
    'CLOUDY': 'icon-cloud', //阴
    'RAIN': 'icon-rain', //雨
    'SNOW': 'icon-snow', //雪
    'WIND': 'icon-wind', //风
    'FOG': 'icon-fog' //雾
}
const pageData = {
    data: {
        location: {
            latitude: '',
            longitude: '',
        },
        locationName: '',
        weatherBg: '',
        windSpeed: '-',
        humidity: '-',
        pm25: '-',
        weatherIcon: '',
        temperature: '-',
        todayForeCast: '',
        week: [],
        isprecipitationShow: true,
        precipitationImage: ''
    },
    onLoad() {
        const self = this;
        wx.getLocation({
            success(res) {
                console.log(res);
                const latitude = res.latitude;
                const longitude = res.longitude;
                self.setData({
                    location: {
                        latitude,
                        longitude
                    }
                });
                self.getLocationName();
                self.getWeather();
                self.getForeCast();
            },
            fail() {
                wx.showToast({
                    title: '暂时无法获取您的位置',
                    duration: 2000,
                    mask: true
                })
            }
        })

    },
    reLocation() {
        const self = this;
        wx.chooseLocation({
            success(res) {
                console.log('reLocation', res);
                const {
                    name,
                    latitude,
                    longitude
                } = res;
                self.setData({
                    location: {
                        latitude,
                        longitude
                    },
                    locationName: name
                });
                if (!name) {
                    self.getLocationName();
                }
                self.getWeather();
                self.getForeCast();
            }
        })
    },
    getLocationName() {
        const self = this;
        const {
            longitude,
            latitude
        } = self.data.location || {};
        wx.request({
            url: `https://api.map.baidu.com/geocoder/v2/?ak=CdYDr23g34taKZTm0HN2bnIKLRa9swve&location=${latitude},${longitude}&pois=1&output=json`,
            data: {},
            success(res) {
                const addressComponent = res.data && res.data.result && res.data.result.addressComponent || {};
                self.setData({
                    locationName: addressComponent.district + addressComponent.street + addressComponent.street_number
                });
                console.log('baidu', res);
            }
        });
    },
    getWeather() {
        const self = this;
        const {
            longitude,
            latitude
        } = self.data.location || {};
        wx.request({
            url: `https://api.caiyunapp.com/v2/cFajHfHm=qelb1dY/${longitude},${latitude}/realtime.json`,
            data: {},
            success(res) {
                console.log('caiyunapp success', res);
                if (res.statusCode === 200) {
                    const result = (res.data && res.data.result) || {};
                    self.setData({
                        windSpeed: (result.wind && parseInt(result.wind.speed)) || '-',
                        humidity: parseInt(result.humidity * 100) || '-',
                        pm25: parseInt(result.pm25),
                        skycon: result.skycon || '-',
                        temperature: parseInt(result.temperature),
                        weatherIcon: weatherIcon[result.skycon]
                    });
                }
            },
            fail() {
                console.log('caiyunapp fail');
            }
        });
    },
    getForeCast() {
        const self = this;
        const {
            longitude,
            latitude
        } = self.data.location || {};
        const context = wx.createCanvasContext('precipitationCanvas');
        let x = 0;
        context.setFontSize(10);


        const sysWidth = wx.getSystemInfoSync().screenWidth;
        const rpxVal = sysWidth / 750;
        const canvasWidth = 700 * rpxVal;
        const canvasHeight = 250 * rpxVal;
        const contentWidth = canvasWidth - 20;
        const contentHeight = canvasHeight - 20;
        context.moveTo(0, 0);
        context.lineTo(0, contentHeight);
        context.lineTo(contentWidth, contentHeight);
        context.stroke();
        context.draw();
        wx.request({
            url: `https://api.caiyunapp.com/v2/cFajHfHm=qelb1dY/${longitude},${latitude}/forecast.json`,
            data: {},
            success(res) {
                try {
                    const SPRINKLE = 0.25;
                    const MIDDLE = 0.35;
                    const result = res.data.result;
                    self.setData({
                        todayForeCast: result.minutely.description
                    });
                    const precipitation = result.minutely.precipitation_2h;
                    const interval = contentWidth / (precipitation.length);
                    let max = 0;
                    for (let i = 0; i < precipitation.length; i++) {
                        const preValue = precipitation[i];
                        if (preValue > max) {
                            max = preValue;
                        }
                    }
                    if (max < SPRINKLE) {
                        max = SPRINKLE;
                    }
                    const exchange = max / contentHeight;
                    const points = [];
                    context.setFillStyle('gray');
                    context.fillText('1小时', interval * 60 - 15, canvasHeight - 10);
                    context.fillText('2小时', interval * 120 - 15, canvasHeight - 10);
                    for (let i = 0; i < precipitation.length; i++) {
                        points.push({
                            x: interval * i,
                            y: contentHeight - precipitation[i] / exchange
                        });
                    }
                    const grd = context.createLinearGradient(0, MIDDLE * exchange, 0, 0);
                    grd.addColorStop(0, 'blue');
                    grd.addColorStop(1, 'red');
                    context.setStrokeStyle(grd);
                    context.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length - 2; i++) {
                        var xc = (points[i].x + points[i + 1].x) / 2;
                        var yc = (points[i].y + points[i + 1].y) / 2;
                        context.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
                    }
                    context.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, points[points.length - 1].x, points[points.length - 1].y);

                    context.stroke();

                    context.setStrokeStyle('gray');
                    context.setFillStyle('gray');
                    context.setLineDash([10, 20], 5);
                    context.beginPath();
                    console.log(contentHeight, exchange);
                    context.moveTo(0, (contentHeight - SPRINKLE / exchange));
                    context.lineTo(contentWidth, (contentHeight - SPRINKLE / exchange));
                    context.fillText(`小雨(${SPRINKLE})`, 0, (contentHeight - SPRINKLE / exchange) + 15);
                    if (max > MIDDLE) {
                        context.moveTo(0, MIDDLE);
                        context.lineTo(contentWidth, Math.min(max, MIDDLE));
                        context.fillText(`中雨(${MIDDLE})`, 0, Math.min(max, MIDDLE) + 15);
                    }
                    context.stroke();
                    context.draw(true);
                    wx.canvasToTempFilePath({
                        canvasId: 'precipitationCanvas',
                        success(res) {
                            self.setData({
                                isprecipitationShow: false,
                                precipitationImage: res.tempFilePath
                            });
                        }
                    })

                    const week = [];
                    const daily = result.daily;
                    const getDay = (dayStr) => {
                        const week = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
                        return week[new Date(dayStr).getDay()];
                    }
                    const skycon = daily.skycon;
                    for (let i = 0; i < skycon.length; i++) {
                        week.push({
                            day: getDay(skycon[i].date),
                            skycon: weatherIcon[skycon[i].value],
                            temperature: daily.temperature[i].avg
                        })
                    }
                    self.setData({
                        week
                    });
                } catch (e) {
                    console.log(e);
                }

            }
        })
    },
    touchMove() {

    },
    fixFloat(num) {
        return parseFloat(num).toFixed(2);
    },
    takePicture() {
        console.log('takePicture');
        const self = this;
        wx.chooseImage({
            count: 1,
            success(res) {
                const path = res.tempFilePaths[0];
                self.setData({
                    weatherBg: path
                })
            }
        });
    }
};
Page(pageData);