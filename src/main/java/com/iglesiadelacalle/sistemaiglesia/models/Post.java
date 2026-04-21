package com.iglesiadelacalle.sistemaiglesia.models;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "post")
public class Post {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_post")
    private Integer idPost;

    @Column(name = "tipo_post", length = 9, nullable = false)
    private String tipoPost;

    @Column(length = 40, nullable = false)
    private String titulo;

    @Column(nullable = false)
    private LocalDate fecha;

    @Column(nullable = false)
    private LocalTime hora;

    @ManyToOne
    @JoinColumn(name = "id_autor", nullable = false)
    private Persona autor;

    @ManyToOne
    @JoinColumn(name = "id_director")
    private Persona director;

    @ManyToOne
    @JoinColumn(name = "id_predicador")
    private Persona predicador;

    // Cambiamos la relación por un texto simple para invitados externos
    @Column(name = "invitado_nombre", length = 100)
    private String invitadoNombre;

    // Getters y Setters
    public Integer getIdPost() { return idPost; }
    public void setIdPost(Integer idPost) { this.idPost = idPost; }
    public String getTipoPost() { return tipoPost; }
    public void setTipoPost(String tipoPost) { this.tipoPost = tipoPost; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public LocalDate getFecha() { return fecha; }
    public void setFecha(LocalDate fecha) { this.fecha = fecha; }
    public LocalTime getHora() { return hora; }
    public void setHora(LocalTime hora) { this.hora = hora; }
    public Persona getAutor() { return autor; }
    public void setAutor(Persona autor) { this.autor = autor; }
    public Persona getDirector() { return director; }
    public void setDirector(Persona director) { this.director = director; }
    public Persona getPredicador() { return predicador; }
    public void setPredicador(Persona predicador) { this.predicador = predicador; }
    public String getInvitadoNombre() { return invitadoNombre; }
    public void setInvitadoNombre(String invitadoNombre) { this.invitadoNombre = invitadoNombre; }
}