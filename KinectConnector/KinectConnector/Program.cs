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
        MultiSourceFrameReader reader;
        IList<Body> bodies;
        StreamWriter sw;
        bool recording;
        byte[] color_buffer;
        WriteableBitmap color_bmp;
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
                if (!Directory.Exists(Path.GetDirectoryName(dir)))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(dir));
                    Directory.CreateDirectory(Path.GetDirectoryName(dir + "frames/"));
                    Directory.CreateDirectory(Path.GetDirectoryName(dir + "depth/"));
                }
                sw = new StreamWriter(dir + "skeleton.csv");
            });
            socket.On("cancel", () =>
            {
                Console.WriteLine("Canceling recording");
                sw.Close();
                recording = false;
            });
            socket.On("complete", () =>
            {
                Console.WriteLine("Completed recording");
                sw.Close();
                recording = false;
            });

            //Kinect
            sensor = KinectSensor.GetDefault();
            if(sensor != null)
            {
                sensor.Open();
            }
            var color_fd = sensor.ColorFrameSource.CreateFrameDescription(ColorImageFormat.Bgra);
            color_buffer = new byte[color_fd.LengthInPixels * color_fd.BytesPerPixel];
            color_bmp = new WriteableBitmap(color_fd.Width, color_fd.Height, 96.0, 96.0, PixelFormats.Bgr32, null);
            reader = sensor.OpenMultiSourceFrameReader(FrameSourceTypes.Color | FrameSourceTypes.Depth | FrameSourceTypes.Body);
            reader.MultiSourceFrameArrived += Reader_MultiSourceFrameArrived;
        }

        void Reader_MultiSourceFrameArrived(object sender, MultiSourceFrameArrivedEventArgs e)
        {
            if (!recording) return;

            var reference = e.FrameReference.AcquireFrame();

            //Color
            using(var frame = reference.ColorFrameReference.AcquireFrame())
            {
                if (frame != null)
                {
                    frame.CopyConvertedFrameDataToArray(color_buffer, ColorImageFormat.Bgra);

                    var fd = frame.FrameDescription;
                    var bpp = (PixelFormats.Bgr32.BitsPerPixel) / 8;
                    var stride = bpp * fd.Width;
                    BitmapSource bmpSource = BitmapSource.Create(fd.Width, fd.Height, 96.0, 96.0, PixelFormats.Bgr32, null, color_buffer, stride);
                    color_bmp = new WriteableBitmap(bmpSource);
                    JpegBitmapEncoder encoder = new JpegBitmapEncoder();
                    encoder.Frames.Add(BitmapFrame.Create(bmpSource));
                    string path = dir + "frames/" + string.Format("{0:hh-mm-ss.fff}.jpg", DateTime.Now);
                    Console.WriteLine(path);
                    using (var fs = new FileStream(@path, FileMode.Create, FileAccess.Write))
                    {
                        encoder.Save(fs);
                    }
                }
            }

            //Depth
            using (var frame = reference.DepthFrameReference.AcquireFrame())
            {
                if (frame != null)
                {
                    int width = frame.FrameDescription.Width;
                    int height = frame.FrameDescription.Height;

                    ushort minDepth = frame.DepthMinReliableDistance;
                    ushort maxDepth = frame.DepthMaxReliableDistance;

                    ushort[] depthData = new ushort[width * height];
                    byte[] pixelData = new byte[width * height * (PixelFormats.Bgr32.BitsPerPixel + 7) / 8];

                    frame.CopyFrameDataToArray(depthData);

                    int colorIndex = 0;
                    for (int depthIndex = 0; depthIndex < depthData.Length; ++depthIndex)
                    {
                        ushort depth = depthData[depthIndex];
                        byte intensity = (byte)(depth >= minDepth && depth <= maxDepth ? depth : 0);

                        pixelData[colorIndex++] = intensity; // Blue
                        pixelData[colorIndex++] = intensity; // Green
                        pixelData[colorIndex++] = intensity; // Red

                        ++colorIndex;
                    }

                    var bpp = (PixelFormats.Bgr32.BitsPerPixel) / 8;
                    var stride = bpp * width;
                    BitmapSource bmpSource = BitmapSource.Create(width, height, 96.0, 96.0, PixelFormats.Bgr32, null, pixelData, stride);
                    WriteableBitmap bmp = new WriteableBitmap(bmpSource);
                    JpegBitmapEncoder encoder = new JpegBitmapEncoder();
                    encoder.Frames.Add(BitmapFrame.Create(bmpSource));
                    string path = dir + "depth/" + string.Format("{0:hh-mm-ss.fff}.jpg", DateTime.Now);
                    using (var fs = new FileStream(@path, FileMode.Create, FileAccess.Write))
                    {
                        encoder.Save(fs);
                    }
                }
            }

            //Body
            using (var frame = reference.BodyFrameReference.AcquireFrame())
            {
                if (frame != null)
                {
                    bodies = new Body[frame.BodyFrameSource.BodyCount];

                    frame.GetAndRefreshBodyData(bodies);

                    foreach (Body body in bodies)
                    {
                        if (body != null)
                        {
                            if (body.IsTracked)
                            {
                                var line = string.Format("{0:hh-mm-ss.fff}.jpg", DateTime.Now);
                                foreach (JointType jt in Enum.GetValues(typeof(JointType)))
                                {
                                    Joint joint = body.Joints[jt];
                                    line += "," + jt.ToString() + "," + joint.Position.X + "," + joint.Position.Y + "," + joint.Position.Z;
                                }
                                sw.WriteLine(line);
                            }
                        }
                    }
                }
            }
        }
    }
}
