using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Windows;
using Microsoft.Kinect;
using System.Windows.Media.Imaging;
using System.Windows.Media;
using System.IO;
using Quobject.SocketIoClientDotNet.Client;

namespace KinectConnector
{
    class Program
    {
        KinectSensor sensor;
        bool recording;
        byte[] buffer;
        WriteableBitmap bmp;
        string name = "unnamed";
        string curStep = "-1";
        string dir;

        static void Main(string[] args)
        {
            Program p = new Program();
            p.init();
            Console.ReadLine();
        }

        void init()
        {
            //Socket
            var socket = IO.Socket("http://localhost:3000");
            socket.On("name", (data) =>
            {
                Console.WriteLine("Name " + data.ToString() + " received");
                name = data.ToString();
            });
            socket.On("start", (data) =>
            {
                Console.WriteLine("Beginning recording");
                recording = true;
                curStep = data.ToString();
                dir = "C:/data/" + string.Format("{0:dd.HH.mm}", DateTime.Now) + "-step" + curStep + "-" + name + "/";
                if(!Directory.Exists(Path.GetDirectoryName(dir)))
                    Directory.CreateDirectory(Path.GetDirectoryName(dir));
            });
            socket.On("cancel", () =>
            {
                Console.WriteLine("Canceling recording");
                recording = false;
            });
            socket.On("complete", () =>
            {
                Console.WriteLine("Completed recording");
                recording = false;
            });

            //Kinect
            sensor = KinectSensor.GetDefault();
            if(sensor != null)
            {
                sensor.Open();
            }
            var fd = sensor.ColorFrameSource.CreateFrameDescription(ColorImageFormat.Bgra);
            buffer = new byte[fd.LengthInPixels * fd.BytesPerPixel];
            bmp = new WriteableBitmap(fd.Width, fd.Height, 96.0, 96.0, PixelFormats.Bgr32, null);
            sensor.ColorFrameSource.OpenReader().FrameArrived += SensorColorFrameReady;
        }

        void SensorColorFrameReady(object sender, ColorFrameArrivedEventArgs e)
        {
            using(ColorFrame frame = e.FrameReference.AcquireFrame())
            {
                if (frame == null) return;

                frame.CopyConvertedFrameDataToArray(buffer, ColorImageFormat.Bgra);

                var fd = frame.FrameDescription;
                var bpp = (PixelFormats.Bgr32.BitsPerPixel) / 8;
                var stride = bpp * fd.Width;
                BitmapSource bmpSource = BitmapSource.Create(fd.Width, fd.Height, 96.0, 96.0, PixelFormats.Bgr32, null, buffer, stride);
                bmp = new WriteableBitmap(bmpSource);

                if (recording)
                {
                    JpegBitmapEncoder encoder = new JpegBitmapEncoder();
                    encoder.Frames.Add(BitmapFrame.Create(bmpSource));
                    string path = dir + string.Format("{0:hh-mm-ss.fff}.jpg", DateTime.Now);
                    Console.WriteLine(path);
                    using (var fs = new FileStream(@path, FileMode.Create, FileAccess.Write))
                    {
                        encoder.Save(fs);
                    }
                }                
            }
        }
    }
}
